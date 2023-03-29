/*

Generate the appropriate fragment for the current form, then
wrap the main Form component with the necessary HoCs while passing
them the fragment.

This component is itself wrapped with:

- withUser
- withApollo (used to access the Apollo client for form pre-population)

And wraps the Form component with:

- withCreate

Or:

- withSingle
- withUpdate
- withDelete

(When wrapping with withSingle, withUpdate, and withDelete, a special Loader
component is also added to wait for withSingle's loading prop to be false)

*/

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { intlShape } from '../../lib/vulcan-i18n';
// HACK: withRouter should be removed or turned into withLocation, but
// FormWrapper passes props around in bulk, and Form has a bunch of prop-name
// handling by string gluing, so it's hard to be sure this is safe.
// eslint-disable-next-line no-restricted-imports
import { withRouter } from 'react-router';
import { gql } from '@apollo/client';
import { withApollo } from '@apollo/client/react/hoc';
import compose from 'lodash/flowRight';
import { Components, registerComponent, getFragment } from '../../lib/vulcan-lib';
import { capitalize } from '../../lib/vulcan-lib/utils';
import { withCreate } from '../../lib/crud/withCreate';
import { withSingle } from '../../lib/crud/withSingle';
import { withDelete } from '../../lib/crud/withDelete';
import { withUpdate } from '../../lib/crud/withUpdate';
import { getSchema } from '../../lib/utils/getSchema';
import withUser from '../common/withUser';
import {
  getReadableFields,
  getCreateableFields,
  getUpdateableFields
} from '../../lib/vulcan-forms/schema_utils';

import withCollectionProps from './withCollectionProps';
import { callbackProps, SmartFormProps } from './propTypes';
import * as _ from 'underscore';

const intlSuffix = '_intl';

/**
 * Wrapper around Form (vulcan-forms/Form.tsx) which applies HoCs for loading
 * and saving data. Note that this wrapper is itself wrapped by WrappedSmartForm
 * (in form-components/WrappedSmartForm.tsx), which adds a submitCallback that
 * may be needed for text-editor fields; so you should use that wrapper, not
 * this one.
 */
const FormWrapper = (props: SmartFormProps) => {
  // return the current schema based on either the schema or collection prop
  const schema = props.schema
    ? props.schema
    : getSchema(props.collection);

  // if a document is being passed, this is an edit form
  const getFormType = () => {
    return props.documentId || props.slug ? 'edit' : 'new';
  }

  // get fragment used to decide what data to load from the server to populate the form,
  // as well as what data to ask for as return value for the mutation
  const getFragments = () => {
    const prefix = `${props.collectionName}${capitalize(
      getFormType()
    )}`;
    const fragmentName = `${prefix}FormFragment`;

    const fields = props.fields;
    const readableFields = getReadableFields(schema);
    const createableFields = getCreateableFields(schema);
    const updatetableFields = getUpdateableFields(schema);

    // get all editable/insertable fields (depending on current form type)
    let queryFields = getFormType() === 'new' ? createableFields : updatetableFields;
    // for the mutations's return value, also get non-editable but viewable fields (such as createdAt, userId, etc.)
    let mutationFields =
      getFormType() === 'new'
        ? _.unique(createableFields.concat(readableFields))
        : _.unique(createableFields.concat(updatetableFields));

    // if "fields" prop is specified, restrict list of fields to it
    if (typeof fields !== 'undefined' && fields.length > 0) {
      // add "_intl" suffix to all fields in case some of them are intl fields
      const fieldsWithIntlSuffix = fields.map(field => `${field}${intlSuffix}`);
      const allFields = [...fields, ...fieldsWithIntlSuffix];
      queryFields = _.intersection(queryFields, allFields);
      mutationFields = _.intersection(mutationFields, allFields);
    }

    // add "addFields" prop contents to list of fields
    if (props.addFields && props.addFields.length) {
      queryFields = queryFields.concat(props.addFields);
      mutationFields = mutationFields.concat(props.addFields);
    }

    const convertFields = field => {
      return field.slice(-5) === intlSuffix ? `${field}{ locale value }` : field;
    };

    // generate query fragment based on the fields that can be edited. Note: always add _id.
    const generatedQueryFragment = gql`
      fragment ${fragmentName}Query on ${props.typeName} {
        _id
        ${queryFields.map(convertFields).join('\n')}
      }
    `;

    // generate mutation fragment based on the fields that can be edited and/or viewed. Note: always add _id.
    const generatedMutationFragment = gql`
      fragment ${fragmentName}Mutation on ${props.typeName} {
        _id
        ${mutationFields.map(convertFields).join('\n')}
      }
    `;

    // default to generated fragments
    let queryFragment = generatedQueryFragment;
    let mutationFragment = generatedMutationFragment;

    // if queryFragment or mutationFragment props are specified, accept either fragment object or fragment string
    if (props.queryFragment) {
      queryFragment =
        typeof props.queryFragment === 'string'
          ? gql`
              ${props.queryFragment}
            `
          : props.queryFragment;
    }
    if (props.mutationFragment) {
      mutationFragment =
        typeof props.mutationFragment === 'string'
          ? gql`
              ${props.mutationFragment}
            `
          : props.mutationFragment;
    }

    // same with queryFragmentName and mutationFragmentName
    if (props.queryFragmentName) {
      queryFragment = getFragment(props.queryFragmentName);
    }
    if (props.mutationFragmentName) {
      mutationFragment = getFragment(props.mutationFragmentName);
    }

    // get query & mutation fragments from props or else default to same as generatedFragment
    return {
      queryFragment,
      mutationFragment,
    };
  }

  const getComponent = () => {
    let WrappedComponent;

    const prefix = `${props.collectionName}${capitalize(
      getFormType()
    )}`;

    const {
      queryFragment,
      mutationFragment,
    } = getFragments();

    // LESSWRONG: ADDED extraVariables option
    const { extraVariables = {}, extraVariablesValues } = props

    // props to pass on to child component (i.e. <Form />)
    const childProps = {
      formType: getFormType(),
      schema,
    };

    // options for withSingle HoC
    const queryOptions: any = {
      queryName: `${prefix}FormQuery`,
      collection: props.collection,
      fragment: queryFragment,
      extraVariables,
      fetchPolicy: 'network-only', // we always want to load a fresh copy of the document
      pollInterval: 0 // no polling, only load data once
    };

    // options for withCreate, withUpdate, and withDelete HoCs
    const mutationOptions = {
      collectionName: props.collection.collectionName,
      fragment: mutationFragment,
      extraVariables
    };

    // create a stateless loader component,
    // displays the loading state if needed, and passes on loading and document/data
    const Loader = props => {
      const { document, loading } = props;
      return loading ? (
        <Components.Loading />
      ) : (
        <Components.Form
          document={document}
          loading={loading}
          {...childProps}
          {...props}
        />
      );
    };
    Loader.displayName = 'withLoader(Form)';

    // if this is an edit from, load the necessary data using the withSingle HoC
    if (getFormType() === 'edit') {
      WrappedComponent = compose(
        withSingle(queryOptions),
        withUpdate(mutationOptions),
        withDelete(mutationOptions)
      // @ts-ignore
      )(Loader);

      return (
        <WrappedComponent
          selector={{
            documentId: props.documentId,
            slug: props.slug
          }}
        />
      );
    } else {
      WrappedComponent = compose(withCreate(mutationOptions))(Components.Form);
      return <WrappedComponent {...childProps} />;
    }
  }

  const [component] = useState(() => getComponent());
  const componentWithParentProps = React.cloneElement(component, props);
  return componentWithParentProps;
}

(FormWrapper as any).propTypes = {
  // main options
  collection: PropTypes.object.isRequired,
  collectionName: PropTypes.string.isRequired,
  typeName: PropTypes.string.isRequired,

  documentId: PropTypes.string, // if a document is passed, this will be an edit form
  schema: PropTypes.object, // usually not needed
  queryFragment: PropTypes.object,
  queryFragmentName: PropTypes.string,
  mutationFragment: PropTypes.object,
  mutationFragmentName: PropTypes.string,

  // graphQL
  newMutation: PropTypes.func, // the new mutation
  removeMutation: PropTypes.func, // the remove mutation

  // form
  prefilledProps: PropTypes.object,
  layout: PropTypes.string,
  fields: PropTypes.arrayOf(PropTypes.string),
  hideFields: PropTypes.arrayOf(PropTypes.string),
  addFields: PropTypes.arrayOf(PropTypes.string),
  showRemove: PropTypes.bool,
  submitLabel: PropTypes.node,
  cancelLabel: PropTypes.node,
  revertLabel: PropTypes.node,
  repeatErrors: PropTypes.bool,
  warnUnsavedChanges: PropTypes.bool,

  // callbacks
  ...callbackProps,

  currentUser: PropTypes.object,
  client: PropTypes.object
};

(FormWrapper as any).defaultProps = {
  layout: 'horizontal'
};

(FormWrapper as any).contextTypes = {
  closeCallback: PropTypes.func,
  intl: intlShape
};

const FormWrapperComponent = registerComponent('FormWrapper', FormWrapper, {
  hocs: [withUser, withApollo, withRouter, withCollectionProps],
  areEqual: "auto",
});

declare global {
  interface ComponentTypes {
    FormWrapper: typeof FormWrapperComponent
  }
}

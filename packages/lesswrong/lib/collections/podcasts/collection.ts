import schema from './schema';
import { createCollection } from '../../vulcan-lib';
import { addUniversalFields, getDefaultResolvers } from '../../collectionUtils';
import { forumTypeSetting } from '../../instanceSettings';

export const Podcasts: PodcastsCollection = createCollection({
  collectionName: 'Podcasts',
  typeName: 'Podcast',
  collectionType: 'pg',
  schema,
  resolvers: getDefaultResolvers('Podcasts')
});

addUniversalFields({ collection: Podcasts });

export default Podcasts;

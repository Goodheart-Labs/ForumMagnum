import React, { useCallback, useState } from 'react';
import { Components, registerComponent } from '../../lib/vulcan-lib';
import { useUpdateCurrentUser } from '../hooks/useUpdateCurrentUser';
import { useLocation } from '../../lib/routeUtil';
import { useCurrentUser } from '../common/withUser';
import { MAX_LOW_KARMA_THRESHOLD } from '../../lib/collections/posts/views'
import { AnalyticsContext, useTracking } from "../../lib/analyticsEvents";
import { isEAForum, siteNameWithArticleSetting } from '../../lib/instanceSettings';
import { SORT_ORDER_OPTIONS } from '../../lib/collections/posts/sortOrderOptions';
import { preferredHeadingCase } from '../../lib/forumTypeUtils';
import Tooltip from '@material-ui/core/Tooltip';

const styles = (theme: ThemeType): JssStyles => ({
  title: {
    cursor: "pointer",
    "& .SectionTitle-title": isEAForum
      ? {
        color: theme.palette.grey[1000],
        textTransform: "none",
        fontWeight: 600,
        fontSize: 28,
        letterSpacing: "0",
        lineHeight: "34px",
      }
      : {},
  },
  divider: isEAForum
    ? {
      border: "none",
      borderTop: `1px solid ${theme.palette.grey[300]}`,
    }
    : {
      display: "none",
    },
});

export const timeframes = {
  allTime: 'All time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

const description = `All of ${siteNameWithArticleSetting.get()}'s posts, filtered and sorted however you want`;

const formatSort = (sorting: string) => {
  const sort = SORT_ORDER_OPTIONS[sorting].label
  return isEAForum ? sort : `Sorted by ${sort}`;
}

const AllPostsPage = ({classes}: {classes: ClassesType}) => {
  const currentUser = useCurrentUser();
  const updateCurrentUser = useUpdateCurrentUser();
  const {query} = useLocation();
  const {captureEvent} = useTracking();

  const [showSettings, setShowSettings] = useState<boolean>(!!currentUser?.allPostsOpenSettings);

  const toggleSettings = useCallback(() => {
    const newValue = !showSettings;
    setShowSettings(newValue);
    captureEvent("toggleSettings", {
      action: newValue,
      listContext: "allPostsPage",
    });
    if (currentUser) {
      void updateCurrentUser({
        allPostsOpenSettings: newValue,
      });
    }
  }, [showSettings, captureEvent, currentUser, updateCurrentUser]);

  const currentTimeframe = query.timeframe || currentUser?.allPostsTimeframe || 'daily';
  const currentSorting = query.sortedBy    || currentUser?.allPostsSorting   || 'magic';
  const currentFilter = query.filter       || currentUser?.allPostsFilter    || 'all';
  const currentShowLowKarma = (parseInt(query.karmaThreshold) === MAX_LOW_KARMA_THRESHOLD) ||
    currentUser?.allPostsShowLowKarma || false;
  const currentIncludeEvents = (query.includeEvents === 'true') || currentUser?.allPostsIncludeEvents || false;
  const currentHideCommunity = (query.hideCommunity === 'true') || currentUser?.allPostsHideCommunity || false;

  const {
    SingleColumnSection, SectionTitle, SortButton, PostsListSettings, HeadTags,
    AllPostsList,
  } = Components;

  return (
    <>
      <HeadTags description={description} />
      <AnalyticsContext pageContext="allPostsPage">
        <SingleColumnSection>
          <Tooltip
            title={`${showSettings ? "Hide": "Show"} options for sorting and filtering`}
            placement="top-end"
          >
            <div className={classes.title} onClick={toggleSettings}>
              <SectionTitle title={preferredHeadingCase("All Posts")}>
                <SortButton label={formatSort(currentSorting)} />
              </SectionTitle>
            </div>
          </Tooltip>
          {!showSettings && <hr className={classes.divider} />}
          <PostsListSettings
            hidden={!showSettings}
            currentTimeframe={currentTimeframe}
            currentSorting={currentSorting}
            currentFilter={currentFilter}
            currentShowLowKarma={currentShowLowKarma}
            currentIncludeEvents={currentIncludeEvents}
            currentHideCommunity={currentHideCommunity}
            persistentSettings
            showTimeframe
          />
          <AllPostsList
            {...{
              currentTimeframe,
              currentSorting,
              currentFilter,
              currentShowLowKarma,
              currentIncludeEvents,
              currentHideCommunity,
              showSettings,
            }}
          />
        </SingleColumnSection>
      </AnalyticsContext>
    </>
  );
}

const AllPostsPageComponent = registerComponent(
  "AllPostsPage",
  AllPostsPage,
  {styles},
);

declare global {
  interface ComponentTypes {
    AllPostsPage: typeof AllPostsPageComponent
  }
}

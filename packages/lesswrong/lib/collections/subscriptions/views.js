import { Subscriptions } from "./collection.js"
import { ensureIndex } from '../../collectionUtils';

//Messages for a specific conversation
Subscriptions.addView("subscriptionState", function (terms) {
  const { userId, documentId, collectionName, type} = terms
  return {
    selector: {userId, documentId, collectionName, type, deleted: false},
    options: {sort: {createdAt: -1}, limit: 1}
  };
});
ensureIndex(Subscriptions, {userId: 1, documentId: 1, collectionName: 1, type: 1, createdAt: 1});

Subscriptions.addView("subscriptionsOfType", function (terms) {
  return {
    selector: {
      userId: terms.userId,
      collectionName: terms.collectionName,
      type: terms.subcriptionType,
      deleted: false,
      state: "subscribed",
    },
    options: {sort: {createdAt: -1}}
  };
});

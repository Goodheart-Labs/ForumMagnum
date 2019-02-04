// Convention: Migration scripts (starting from when this migration
// infrastructure was put in place) live in this directory (server/migrations),
// and are named "YYYY-MM-DD-migrationDescription.js", with the date when the
// script was written.

import './2019-01-04-voteSchema';
import './2019-01-21-denormalizeVoteCount';
import './2019-01-24-karmaChangeSettings';

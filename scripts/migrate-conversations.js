const connectDatabaseModule = require('../src/config/database');
const conversationModule = require('../src/models/Conversation');

const connectDatabase = connectDatabaseModule.default || connectDatabaseModule;
const Conversation = conversationModule.default || conversationModule;

const MAX_MESSAGES_PER_CONVERSATION = 200;

function cleanString(value) {
  return String(value || '').trim();
}

function normalizeParticipantIds(ids) {
  return Array.from(new Set((ids || []).map(id => cleanString(id)).filter(Boolean))).sort();
}

function buildParticipantKey(ids) {
  return normalizeParticipantIds(ids).join(':');
}

function mergeConversationMessages(conversations) {
  const merged = [];
  conversations.forEach(conversation => {
    (conversation.messages || []).forEach(message => {
      merged.push(message.toObject ? message.toObject() : message);
    });
  });
  merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return merged.slice(-MAX_MESSAGES_PER_CONVERSATION);
}

function mergeParticipantNames(conversations) {
  const map = new Map();
  conversations.forEach(conversation => {
    if (!conversation.participantNames) return;
    conversation.participantNames.forEach((name, id) => {
      if (!map.has(id) && name) map.set(id, name);
    });
  });
  return map;
}

async function backfillParticipantKeys() {
  const cursor = Conversation.find({ archived: { $ne: true } }).cursor();
  let updated = 0;

  for await (const conversation of cursor) {
    const participantIds = normalizeParticipantIds(conversation.participantIds);
    const participantKey = buildParticipantKey(participantIds);

    if (
      conversation.participantKey !== participantKey ||
      participantIds.length !== conversation.participantIds.length
    ) {
      conversation.participantIds = participantIds;
      conversation.participantKey = participantKey;
      conversation.updatedAt = conversation.updatedAt || new Date();
      await conversation.save();
      updated += 1;
    }
  }

  return updated;
}

async function mergeDuplicatesByParticipantKey() {
  const duplicates = await Conversation.aggregate([
    { $match: { archived: { $ne: true } } },
    {
      $group: {
        _id: { listingId: '$listingId', participantKey: '$participantKey' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let mergedCount = 0;
  for (const duplicate of duplicates) {
    const conversations = await Conversation.find({ _id: { $in: duplicate.ids } }).sort({ createdAt: 1 });
    if (conversations.length < 2) continue;

    const keeper = conversations[0];
    const rest = conversations.slice(1);
    keeper.participantIds = normalizeParticipantIds(keeper.participantIds);
    keeper.participantKey = buildParticipantKey(keeper.participantIds);
    keeper.participantNames = mergeParticipantNames(conversations);
    keeper.messages = mergeConversationMessages(conversations);
    keeper.updatedAt = new Date();
    await keeper.save();

    const restIds = rest.map(item => item._id);
    if (restIds.length) {
      await Conversation.deleteMany({ _id: { $in: restIds } });
    }
    mergedCount += 1;
  }

  return mergedCount;
}

async function run() {
  await connectDatabase();
  console.log('Connected to MongoDB.');

  const updated = await backfillParticipantKeys();
  console.log(`Backfilled participant keys for ${updated} conversation(s).`);

  const merged = await mergeDuplicatesByParticipantKey();
  console.log(`Merged ${merged} duplicate conversation group(s).`);

  await Conversation.syncIndexes();
  console.log('Conversation indexes synchronized.');
}

run()
  .then(() => {
    console.log('Conversation migration completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Conversation migration failed:', error);
    process.exit(1);
  });

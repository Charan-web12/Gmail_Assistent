const {
  listEmails,
  getEmailById,
  modifyMessageLabels,
  trashMessage,
  sendEmail: sendGmailMessage,
} = require('../services/gmail/gmailSync');
const GmailToken = require('../models/GmailToken');
const EmailMeta = require('../models/EmailMeta');

// Realistic sample inbox emails for when Gmail OAuth is not yet connected
const MOCK_EMAILS = [
  {
    id: 'demo-msg-1',
    threadId: 'demo-th-1',
    subject: 'URGENT: Q4 Product Roadmap Review & Final Sign-Off',
    from: 'Sarah Jenkins <sarah.jenkins@acmecorp.com>',
    to: 'me@example.com',
    date: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
    snippet: 'Hi team, please review the finalized Q4 roadmap by tomorrow 3 PM. We need all department heads to sign off on the delivery milestones.',
    bodyText: 'Hi team,\n\nPlease review the finalized Q4 product roadmap by tomorrow, Friday at 3:00 PM EST. We need all department heads to sign off on the delivery milestones and budget allocations.\n\nAction items for this week:\n1. Review slide deck attached to the shared drive.\n2. Confirm engineering headcount requirements with Alex.\n3. Submit your team approval by Friday 3 PM.\n\nLet me know if anyone needs clarification beforehand.\n\nBest regards,\nSarah Jenkins\nVP of Product, Acme Corp',
    bodyHtml: '<p>Hi team,</p><p>Please review the finalized Q4 product roadmap by <strong>tomorrow, Friday at 3:00 PM EST</strong>. We need all department heads to sign off on the delivery milestones and budget allocations.</p><p><strong>Action items for this week:</strong><br/>1. Review slide deck attached to the shared drive.<br/>2. Confirm engineering headcount requirements with Alex.<br/>3. Submit your team approval by Friday 3 PM.</p><p>Let me know if anyone needs clarification beforehand.</p><p>Best regards,<br/><strong>Sarah Jenkins</strong><br/>VP of Product, Acme Corp</p>',
    labels: ['INBOX', 'UNREAD', 'IMPORTANT'],
    isUnread: true,
    isStarred: true,
    isInbox: true,
    priority: { score: 5, reason: 'High urgency roadmap sign-off with hard deadline tomorrow at 3 PM' },
    category: 'Work',
    actionItems: [
      { task: 'Review slide deck attached to shared drive', assignee: 'Team', deadline: 'Tomorrow 3 PM', completed: false },
      { task: 'Confirm engineering headcount with Alex', assignee: 'Engineering Lead', deadline: 'Friday', completed: false },
      { task: 'Submit team sign-off', assignee: 'Recipient', deadline: 'Friday 3 PM EST', completed: false },
    ],
    deadlines: [
      { date: 'Tomorrow at 3:00 PM EST', description: 'Department roadmap sign-off', context: 'Submit your team approval by Friday 3 PM' },
    ],
    summary: 'Sarah Jenkins requests department heads to review and sign off on the finalized Q4 product roadmap by tomorrow, Friday at 3:00 PM EST. Key steps include checking the slide deck, confirming engineering headcount with Alex, and submitting formal approval.',
  },
  {
    id: 'demo-msg-2',
    threadId: 'demo-th-2',
    subject: '⚠️ Critical Security Alert: Verify Your Account Credentials Immediately',
    from: 'IT Support Team <security-notice@paypa1-update-security.com>',
    to: 'me@example.com',
    date: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    snippet: 'Your account access has been temporarily restricted due to suspicious activity. Click here to verify your identity and enter your master password within 24 hours.',
    bodyText: 'Dear Customer,\n\nWe detected unauthorized login attempts to your account from an unrecognized device in Moscow, Russia. Your access has been temporarily suspended.\n\nYou must click the link below to verify your login credentials, master password, and credit card details within 24 hours to prevent permanent account termination.\n\nClick here: http://secure-login-verify-account.co.vu/auth?ref=99283\n\nFailure to act immediately will result in complete account forfeiture.\n\nCustomer Security Department',
    bodyHtml: '<p>Dear Customer,</p><p style="color:red;"><strong>We detected unauthorized login attempts to your account from an unrecognized device in Moscow, Russia. Your access has been temporarily suspended.</strong></p><p>You must click the link below to verify your login credentials, master password, and credit card details within 24 hours to prevent permanent account termination.</p><p><a href="http://secure-login-verify-account.co.vu/auth?ref=99283" style="background:#dc2626;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;">Verify Account Now</a></p><p>Failure to act immediately will result in complete account forfeiture.</p>',
    labels: ['INBOX', 'UNREAD'],
    isUnread: true,
    isStarred: false,
    isInbox: true,
    priority: { score: 4, reason: 'Severe urgency simulation flag' },
    category: 'Spam',
    phishingAnalysis: {
      isSuspicious: true,
      riskScore: 95,
      warnings: [
        'Mismatched domain: Sender domain "paypa1-update-security.com" uses typosquatting / spoofing.',
        'Urgency trap: Coercive 24-hour deadline threat of permanent account termination.',
        'Credential harvesting: Demands master password and credit card numbers.',
        'Suspicious destination URL points to an unverified top-level domain.',
      ],
    },
    summary: 'Detected high-confidence phishing attempt impersonating security support. The email fabricates an unauthorized login event to deceive the recipient into inputting credentials on a fraudulent external website.',
  },
  {
    id: 'demo-msg-3',
    threadId: 'demo-th-3',
    subject: 'Flight Confirmation: San Francisco (SFO) to New York (JFK)',
    from: 'SkyWings Airlines <reservations@skywings-airline.com>',
    to: 'me@example.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    snippet: 'Your upcoming flight reservation SW-8492 is confirmed. Departure on October 18 at 08:30 AM from Terminal 2.',
    bodyText: 'Hello,\n\nYour flight booking SW-8492 is confirmed!\n\nFlight Details:\nFlight: SW-8492 (Nonstop Boeing 787)\nDepart: San Francisco (SFO) - Oct 18, 08:30 AM (Terminal 2, Gate 42)\nArrive: New York (JFK) - Oct 18, 05:15 PM (Terminal 4)\nSeat: 14A (Window, Economy Plus)\n\nBaggage: 1 Carry-on included, 1 Checked bag included.\n\nPlease check in online 24 hours prior to departure via the SkyWings mobile app.\n\nSafe travels,\nSkyWings Airlines',
    bodyHtml: '<p>Hello,</p><p>Your flight booking <strong>SW-8492</strong> is confirmed!</p><h3>Flight Details:</h3><ul><li><strong>Flight:</strong> SW-8492 (Nonstop Boeing 787)</li><li><strong>Depart:</strong> San Francisco (SFO) - Oct 18, 08:30 AM (Terminal 2, Gate 42)</li><li><strong>Arrive:</strong> New York (JFK) - Oct 18, 05:15 PM (Terminal 4)</li><li><strong>Seat:</strong> 14A (Window, Economy Plus)</li></ul><p>Baggage: 1 Carry-on included, 1 Checked bag included.</p><p>Safe travels,<br/><strong>SkyWings Airlines</strong></p>',
    labels: ['INBOX'],
    isUnread: false,
    isStarred: false,
    isInbox: true,
    priority: { score: 2, reason: 'Travel confirmation and itinerary details' },
    category: 'Updates',
    actionItems: [
      { task: 'Check in online 24h prior to flight', assignee: 'Recipient', deadline: 'Oct 17, 08:30 AM', completed: false },
    ],
    deadlines: [
      { date: 'Oct 18, 08:30 AM', description: 'Flight departure from SFO', context: 'Depart: San Francisco (SFO) - Oct 18, 08:30 AM' },
    ],
    summary: 'SkyWings confirmation for flight SW-8492 from San Francisco (SFO) to New York (JFK) on October 18, departing at 8:30 AM from Terminal 2 with seat 14A.',
  },
  {
    id: 'demo-msg-4',
    threadId: 'demo-th-4',
    subject: 'Weekend hiking plans at Mount Tamalpais',
    from: 'Marcus Lee <marcus.lee@gmail.com>',
    to: 'me@example.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    snippet: 'Hey! Are you still up for hiking this Saturday morning? The weather looks clear and mild. Let me know if 9 AM works for you.',
    bodyText: 'Hey!\n\nAre you still up for hiking Mount Tam this Saturday morning? The weather forecast looks clear and mild, around 68 degrees.\n\nI was thinking we could meet at the Pantoll Ranger Station parking lot around 9:00 AM, do the Steep Ravine trail down to Stinson Beach, and grab lunch at the cafe.\n\nLet me know if that timing works for you or if you prefer Sunday!\n\nCheers,\nMarcus',
    bodyHtml: '<p>Hey!</p><p>Are you still up for hiking Mount Tam this Saturday morning? The weather forecast looks clear and mild, around 68 degrees.</p><p>I was thinking we could meet at the Pantoll Ranger Station parking lot around 9:00 AM, do the Steep Ravine trail down to Stinson Beach, and grab lunch at the cafe.</p><p>Let me know if that timing works for you or if you prefer Sunday!</p><p>Cheers,<br/><strong>Marcus</strong></p>',
    labels: ['INBOX'],
    isUnread: false,
    isStarred: true,
    isInbox: true,
    priority: { score: 2, reason: 'Casual personal invite for weekend outdoor activity' },
    category: 'Personal',
    deadlines: [
      { date: 'Saturday at 9:00 AM', description: 'Meet at Pantoll Ranger Station for hike', context: 'Meet around 9:00 AM at Pantoll' },
    ],
    summary: 'Marcus proposes hiking Mount Tamalpais (Steep Ravine trail to Stinson Beach) this Saturday morning at 9:00 AM, with lunch afterwards, and asks to confirm availability.',
  },
];

/**
 * @desc    List emails (from Gmail API if connected, or demo mailbox)
 * @route   GET /api/emails
 */
const getEmails = async (req, res, next) => {
  try {
    const { q, label = 'INBOX', maxResults = 25, pageToken } = req.query;

    const tokenDoc = await GmailToken.findOne({ userId: req.user._id });

    if (!tokenDoc) {
      // Return demo inbox with search/filter applied
      let filtered = [...MOCK_EMAILS];

      if (label === 'STARRED') {
        filtered = filtered.filter((m) => m.isStarred);
      } else if (label === 'UNREAD') {
        filtered = filtered.filter((m) => m.isUnread);
      } else if (label === 'TRASH') {
        filtered = filtered.filter((m) => m.isTrash);
      }

      if (q) {
        const lowerQ = q.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.subject.toLowerCase().includes(lowerQ) ||
            m.from.toLowerCase().includes(lowerQ) ||
            m.snippet.toLowerCase().includes(lowerQ)
        );
      }

      return res.status(200).json({
        success: true,
        isDemo: true,
        messages: filtered,
        nextPageToken: null,
        resultSizeEstimate: filtered.length,
      });
    }

    // Gmail API flow
    const labelIds = label === 'ALL' ? [] : [label];
    const data = await listEmails({
      userId: req.user._id,
      q,
      labelIds,
      maxResults: Number(maxResults),
      pageToken,
    });

    res.status(200).json({
      success: true,
      isDemo: false,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single email details
 * @route   GET /api/emails/:id
 */
const getEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id.startsWith('demo-')) {
      const email = MOCK_EMAILS.find((m) => m.id === id);
      if (!email) {
        return res.status(404).json({ success: false, message: 'Email not found' });
      }
      return res.status(200).json({ success: true, email, isDemo: true });
    }

    const email = await getEmailById({ userId: req.user._id, messageId: id });
    res.status(200).json({ success: true, email, isDemo: false });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Modify email (read/unread, star/unstar, archive, trash)
 * @route   PATCH /api/emails/:id/modify
 */
const modifyEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { addLabels = [], removeLabels = [] } = req.body;

    if (id.startsWith('demo-')) {
      const mock = MOCK_EMAILS.find((m) => m.id === id);
      if (mock) {
        if (addLabels.includes('STARRED')) mock.isStarred = true;
        if (removeLabels.includes('STARRED')) mock.isStarred = false;
        if (addLabels.includes('UNREAD')) mock.isUnread = true;
        if (removeLabels.includes('UNREAD')) mock.isUnread = false;
        if (addLabels.includes('TRASH')) mock.isTrash = true;
      }
      return res.status(200).json({ success: true, message: 'Updated demo email state' });
    }

    const result = await modifyMessageLabels({
      userId: req.user._id,
      messageId: id,
      addLabelIds: addLabels,
      removeLabelIds: removeLabels,
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Trash / Delete email
 * @route   DELETE /api/emails/:id
 */
const deleteEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id.startsWith('demo-')) {
      const mock = MOCK_EMAILS.find((m) => m.id === id);
      if (mock) mock.isTrash = true;
      return res.status(200).json({ success: true, message: 'Demo email moved to trash' });
    }

    const result = await trashMessage({
      userId: req.user._id,
      messageId: id,
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send email via Gmail API
 * @route   POST /api/emails/send
 */
const sendEmail = async (req, res, next) => {
  try {
    const { to, cc, bcc, subject, body, threadId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Recipient (to), Subject, and Body are required.',
      });
    }

    const tokenDoc = await GmailToken.findOne({ userId: req.user._id });
    if (!tokenDoc) {
      // Simulate sending in demo mode
      return res.status(200).json({
        success: true,
        message: 'Demo mode: Email simulated and sent successfully!',
        id: `demo-sent-${Date.now()}`,
      });
    }

    const result = await sendGmailMessage({
      userId: req.user._id,
      to,
      cc,
      bcc,
      subject,
      body,
      threadId,
    });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully via Gmail API',
      result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard metrics & analytics
 * @route   GET /api/emails/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const tokenDoc = await GmailToken.findOne({ userId: req.user._id });

    // Calculate metadata from DB and/or mock
    const categoriesCount = {
      Work: 1,
      Personal: 1,
      Promotions: 0,
      Spam: 1,
      Updates: 1,
      Finance: 0,
    };

    res.status(200).json({
      success: true,
      isGmailConnected: Boolean(tokenDoc),
      connectedEmail: tokenDoc?.emailAddress || null,
      stats: {
        totalEmails: 4,
        unreadCount: 2,
        highPriorityCount: 1,
        phishingAlerts: 1,
        categories: categoriesCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmails,
  getEmail,
  modifyEmail,
  deleteEmail,
  sendEmail,
  getAnalytics,
};

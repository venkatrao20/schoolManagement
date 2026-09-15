const ALLOWED_TRANSITIONS = {

  Enquiry: ['Documents'],

  Documents: ['Assessment'],

  Assessment: [],

  Approved: ['Admitted'],

  Rejected: [],

  Admitted: []

};

exports.isValidTransition = (fromStatus, toStatus) => {

  return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) || false;

};

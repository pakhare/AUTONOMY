// src/utils/proposalUtils.js

export const getProposalStatus = (proposal, daoInfo, isExecuted = false) => {
    if (!proposal || !daoInfo) return "";
  
    const now = Date.now() / 1000;
    const deadline = Number(proposal.votingDeadline.toNumber());
    const votesFor = Number(proposal.votesFor);
    const votesAgainst = Number(proposal.votesAgainst);
    const totalVotes = votesFor + votesAgainst;
    const totalMembers = daoInfo.totalMembers || 0;
    const quorumRequired = Math.ceil(totalMembers * 0.6);
  
    if (isExecuted || proposal.executed) {
      return "Executed";
    }
  
    if (now < deadline && totalVotes < totalMembers) {
      return "Active";
    }
  
    if (totalVotes >= quorumRequired || totalVotes === totalMembers) {
      if (votesFor > totalVotes / 2) {
        return "Approved";
      } else {
        return "Rejected";
      }
    }
  
    return "Quorum Not Met";
  };
  
import { notifyLinkedInCrm } from '../scripts/crm_notify.js';

const job = {
  id: 'ule9yp31x',
  company: 'Foundry ',
  title: 'Product manager',
  status: 'Applied',
  lastActionDate: '2026-06-13T04:50:08.057Z'
};

async function test() {
  try {
    console.log('Running notifyLinkedInCrm for Foundry...');
    const result = await notifyLinkedInCrm(job);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error running notify:', error);
  }
}

test();

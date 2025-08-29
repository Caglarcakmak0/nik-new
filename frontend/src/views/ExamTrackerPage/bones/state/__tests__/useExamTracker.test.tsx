import { renderHook, act } from '@testing-library/react';
import { useExamTracker } from '../useExamTracker';

const mockAttempt = (id:string)=> ({ id, date:'2025-08-20', source:'XYZ TYT 1', subjects:[{subject:'Matematik',correct:10,wrong:5,blank:5}], topics:[{subject:'Matematik', topic:'Problemler', wrong:2, asked:5}] });

// Mock API modules
jest.mock('../../../../../services/examAttempts', ()=> ({
  fetchAttempts: jest.fn().mockResolvedValue({ attempts: [mockAttempt('srv-1')], pagination:{} }),
  createAttempt: jest.fn(async (a:any)=> ({ ...a, id:'real-'+a.id })),
  updateAttemptApi: jest.fn(async (a:any)=> a),
  deleteAttempt: jest.fn(async ()=> {}),
  fetchOverviewStats: jest.fn().mockResolvedValue({ averageAccuracy:0.5, lastAccuracy:0.5, delta:0, count:1, tyt:{correct:10,wrong:5,blank:5,net:8.75,accuracy:0.666}, ayt:{correct:0,wrong:0,blank:0,net:0,accuracy:0} }),
  fetchFrequentTopics: jest.fn().mockResolvedValue([]),
  fetchTopicHistory: jest.fn().mockResolvedValue([]),
  fetchAggregateHistory: jest.fn().mockResolvedValue([]),
}));

describe('useExamTracker', () => {
  it('optimistic create success path', async () => {
    const { result } = renderHook(()=> useExamTracker([], { enableRemote:false }));
    expect(result.current.attempts.length).toBe(0);
    await act(async ()=> { await result.current.addAttempt(mockAttempt('temp-1')); });
    expect(result.current.attempts.length).toBe(1);
    expect(result.current.attempts[0].id.startsWith('temp-')).toBe(false); // replaced with real id
  });

  it('rollback on create failure', async () => {
    const { createAttempt } = require('../../../../../services/examAttempts');
    createAttempt.mockImplementationOnce(async ()=> { throw new Error('fail'); });
    const { result } = renderHook(()=> useExamTracker([], { enableRemote:false }));
    await act(async ()=> { await result.current.addAttempt(mockAttempt('temp-2')); });
    expect(result.current.attempts.length).toBe(0); // rolled back
    expect(result.current.error).toBeTruthy();
  });
});

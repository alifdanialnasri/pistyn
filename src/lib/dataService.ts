import { FirestoreService, DataApi } from './firestoreService';
import { MockFirestoreService } from './mockFirestoreService';
import { DEMO_MODE } from './demoConfig';

export const DataService: DataApi = DEMO_MODE ? MockFirestoreService : FirestoreService;

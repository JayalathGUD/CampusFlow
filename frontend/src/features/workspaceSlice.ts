import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { logoutUser } from './authSlice';

const API_URL = '/api/workspaces';

interface Workspace {
  _id: string;
  name: string;
  description: string;
  inviteCode: string;
  owner: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: any[];
  loading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  activeWorkspace: null,
  members: [],
  loading: false,
  error: null
};

export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}`);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch workspaces');
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/createWorkspace',
  async (workspaceData: { name: string; description: string; semester?: string; department?: string }, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}`, workspaceData);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to create workspace');
    }
  }
);

export const joinWorkspaceWithCode = createAsyncThunk(
  'workspace/joinWorkspace',
  async (inviteCode: string, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/join`, { inviteCode });
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to join workspace');
    }
  }
);

export const fetchWorkspaceMembers = createAsyncThunk(
  'workspace/fetchMembers',
  async (workspaceId: string, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}/${workspaceId}/members`);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch members');
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.activeWorkspace = action.payload;
    },
    clearWorkspaceError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Workspaces
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.workspaces = action.payload.workspaces;
      })
      .addCase(fetchWorkspaces.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Workspace
      .addCase(createWorkspace.fulfilled, (state, action: PayloadAction<any>) => {
        state.workspaces.unshift(action.payload.workspace);
      })
      // Join Workspace
      .addCase(joinWorkspaceWithCode.fulfilled, (state, action: PayloadAction<any>) => {
        state.workspaces.push(action.payload.workspace);
      })
      // Fetch Members
      .addCase(fetchWorkspaceMembers.fulfilled, (state, action: PayloadAction<any>) => {
        state.members = action.payload.members;
      })
      // Clear workspaces on logout
      .addCase(logoutUser, (state) => {
        state.workspaces = [];
        state.activeWorkspace = null;
        state.members = [];
        state.loading = false;
        state.error = null;
      });
  }
});

export const { setActiveWorkspace, clearWorkspaceError } = workspaceSlice.actions;
export default workspaceSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = "/api/auth";

// Helper to set auth header
export const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'admin';
  university: string;
  degreeProgram: string;
  academicYear: string;
  skills: string[];
  profilePicture: string;
  bio: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const token = localStorage.getItem('cf_token');
if (token) {
  setAuthToken(token);
}

const initialState: AuthState = {
  user: null,
  token: token,
  loading: false,
  error: null
};

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: any, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/register`, userData);
      if (response.data.token) {
        localStorage.setItem('cf_token', response.data.token);
        setAuthToken(response.data.token);
      }
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (userData: any, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/login`, userData);
      if (response.data.token) {
        localStorage.setItem('cf_token', response.data.token);
        setAuthToken(response.data.token);
      }
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const loginGoogle = createAsyncThunk(
  'auth/google',
  async (googleData: any, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/google`, googleData);
      if (response.data.token) {
        localStorage.setItem('cf_token', response.data.token);
        setAuthToken(response.data.token);
      }
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Google Auth failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem('cf_token');
      if (!token) return thunkAPI.rejectWithValue('No token found');
      setAuthToken(token);
      
      const response = await axios.get(`${API_URL}/me`);
      return response.data;
    } catch (error: any) {
      localStorage.removeItem('cf_token');
      setAuthToken(null);
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Session expired');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: any, thunkAPI) => {
    try {
      const response = await axios.put(`${API_URL}/profile`, profileData);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Profile update failed';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      localStorage.removeItem('cf_token');
      setAuthToken(null);
      state.token = null;
      state.user = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(registerUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Google Login
      .addCase(loginGoogle.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      // Fetch Me
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const u = action.payload.user;
        state.user = u ? { ...u, id: u._id || u.id } : null;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
      })
      // Update Profile
      .addCase(updateUserProfile.fulfilled, (state, action: PayloadAction<any>) => {
        const u = action.payload.user;
        state.user = u ? { ...u, id: u._id || u.id } : null;
      });
  }
});

export const { logoutUser, clearError } = authSlice.actions;
export default authSlice.reducer;

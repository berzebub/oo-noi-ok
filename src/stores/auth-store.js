import { defineStore } from 'pinia'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from 'boot/firebase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isOfflineMode: false
  }),

  getters: {
    userDisplayName: (state) => state.user?.displayName || '',
    userEmail: (state) => state.user?.email || '',
    userPhotoURL: (state) => state.user?.photoURL || '',
    userId: (state) => state.user?.uid || '',
    isLoggedIn: (state) => state.isAuthenticated || state.isOfflineMode
  },

  actions: {
    // Initialize auth listener
    initializeAuth() {
      return new Promise((resolve) => {
        // Check if offline mode is set
        const offlineMode = localStorage.getItem('offlineMode')
        if (offlineMode === 'true') {
          this.isOfflineMode = true
          this.isLoading = false
          resolve()
          return
        }

        // Listen to auth state changes
        onAuthStateChanged(auth, (user) => {
          if (user) {
            this.user = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            }
            this.isAuthenticated = true
          } else {
            this.user = null
            this.isAuthenticated = false
          }
          this.isLoading = false
          resolve()
        })
      })
    },

    // Sign out
    async logout() {
      try {
        if (this.isOfflineMode) {
          localStorage.removeItem('offlineMode')
          this.isOfflineMode = false
        } else {
          await signOut(auth)
        }

        this.user = null
        this.isAuthenticated = false
        return true
      } catch (error) {
        console.error('Logout error:', error)
        return false
      }
    },

    // Set offline mode
    setOfflineMode() {
      this.isOfflineMode = true
      localStorage.setItem('offlineMode', 'true')
    },

    // Clear offline mode
    clearOfflineMode() {
      this.isOfflineMode = false
      localStorage.removeItem('offlineMode')
    }
  }
})

<template>
  <q-page class="simple-page">
    <!-- Header -->
    <div class="simple-header compact-mobile">
      <div class="player-count">
        <div class="gender-count">
          <q-icon name="male" size="sm" color="blue" />
          <span class="count-text">{{ activeMalePlayers.length }}</span>
        </div>
        <div class="gender-count">
          <q-icon name="female" size="sm" color="pink" />
          <span class="count-text">{{ activeFemalePlayers.length }}</span>
        </div>
      </div>

      <div class="court-count">
        <q-icon name="sports_tennis" size="md" color="orange" />
        <span class="count-text">{{ gameSettings.courts }} คอร์ด</span>
      </div>

      <div v-if="hasActiveSession" class="round-info">
        <q-icon name="schedule" size="md" color="green" />
        <span class="count-text">รอบที่ {{ currentRoundNumber }}</span>
      </div>
    </div>

    <!-- No Players Message -->
    <div v-if="totalPlayers === 0" class="no-players-section">
      <q-card class="no-players-card">
        <q-card-section class="text-center">
          <q-icon name="group_off" size="4rem" color="grey-5" class="q-mb-md" />
          <div class="text-h6 q-mb-md">ยังไม่มีผู้เล่น</div>
          <div class="text-body2 text-grey-6 q-mb-lg">
            เริ่มต้นโดยการเพิ่มผู้เล่นก่อน
          </div>
          <q-btn color="primary" label="เพิ่มผู้เล่น" icon="person_add" to="/players" size="lg" rounded />
        </q-card-section>
      </q-card>
    </div>

    <!-- Not Enough Players Message -->
    <div v-else-if="totalPlayers > 0 && activePlayers.length < 4" class="not-enough-section">
      <q-card class="not-enough-card">
        <q-card-section class="text-center">
          <q-icon name="warning" size="3rem" color="amber" class="q-mb-md" />
          <div class="text-h6 q-mb-md">ผู้เล่นไม่เพียงพอ</div>
          <div class="text-body2 text-grey-6 q-mb-lg">
            ต้องการผู้เล่นอย่างน้อย 4 คนที่พร้อมเล่น
            <br>
            (ปัจจุบัน: ชาย {{ activeMalePlayers.length }} คน, หญิง {{ activeFemalePlayers.length }} คน รวม {{
              activePlayers.length }} คน)
          </div>
          <q-btn color="primary" label="จัดการผู้เล่น" icon="group" to="/players" size="md" rounded />
        </q-card-section>
      </q-card>
    </div>

    <!-- Round Management -->
    <div v-if="activePlayers.length >= 4 && hasActiveSession" class="round-management">
      <div class="round-actions">
        <q-btn color="positive" label="เริ่มรอบใหม่" icon="refresh" @click="startNewRound" size="md" :disable="loading"
          outlined />
        <q-btn color="negative" label="จบ Session" icon="stop" @click="stopWinnerStaysOn" size="md" :disable="loading"
          outlined />
      </div>
    </div>

    <!-- Main Action Buttons -->
    <div v-else-if="activePlayers.length >= 4" class="action-buttons">
      <!-- Winner Stays On Button -->
      <div v-if="!isWinnerStaysOnMode" class="single-option-section">
        <q-btn color="green" label="🏆 เริ่มเล่น " @click="startWinnerStaysOn" size="xl" class="main-action-btn"
          :loading="loading" rounded />

      </div>

      <!-- Winner Stays On Controls -->
      <div v-else class="winner-stays-controls">
        <div class="mode-indicator">
          <q-icon name="emoji_events" size="md" color="green" />
          <span class="mode-text">โหมด Winner Stays On</span>
        </div>
        <q-btn color="negative" label="หยุดโหมด" icon="stop" @click="stopWinnerStaysOn" size="md" flat />
      </div>
    </div>

    <!-- Current Matches Display -->
    <div v-if="currentMatches.length > 0" class="matches-display">
      <div class="matches-title">
        <q-icon name="sports_tennis" />
        การจับคู่ปัจจุบัน
      </div>

      <div class="courts-grid">
        <q-card v-for="match in currentMatches" :key="match.id" class="court-card">
          <q-card-section>
            <!-- Court Header -->
            <div class="court-header">
              <q-chip :color="getCourtColor(match.courtNumber)" text-color="white" icon="sports_tennis" size="lg">
                คอร์ด {{ match.courtNumber }}
              </q-chip>
            </div>

            <!-- Teams -->
            <div class="teams-container">
              <!-- Team A -->
              <div class="team"
                :class="{ 'winning-team': isWinnerStaysOnMode && getCourtWinStreak(match.courtNumber)?.teamIndex === 0 }">
                <div class="team-name">
                  ทีม A
                  <q-chip
                    v-if="isWinnerStaysOnMode && getCourtWinStreak(match.courtNumber)?.teamIndex === 0 && getCourtWinStreak(match.courtNumber)?.winCount > 0"
                    :label="`${getCourtWinStreak(match.courtNumber).winCount} ชนะ`" color="positive" text-color="white"
                    size="sm" />
                </div>
                <div class="players">
                  <div v-for="player in getTeamA(match)" :key="player.id" class="player-name">
                    <q-icon :name="player.gender === 'male' ? 'male' : 'female'"
                      :color="player.gender === 'male' ? 'blue' : 'pink'" size="sm" />
                    <span class="player-text">{{ player.name }}</span>
                    <div class="player-actions">
                      <q-btn dense flat round size="sm" icon="swap_horiz" :title="'สลับผู้เล่น'"
                        @click="openSwapDialog(match.id, player.id)" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- VS -->
              <div class="vs-separator">
                VS
              </div>

              <!-- Team B -->
              <div class="team"
                :class="{ 'winning-team': isWinnerStaysOnMode && getCourtWinStreak(match.courtNumber)?.teamIndex === 1 }">
                <div class="team-name">
                  ทีม B
                  <q-chip
                    v-if="isWinnerStaysOnMode && getCourtWinStreak(match.courtNumber)?.teamIndex === 1 && getCourtWinStreak(match.courtNumber)?.winCount > 0"
                    :label="`${getCourtWinStreak(match.courtNumber).winCount} ชนะ`" color="positive" text-color="white"
                    size="sm" />
                </div>
                <div class="players">
                  <div v-for="player in getTeamB(match)" :key="player.id" class="player-name">
                    <q-icon :name="player.gender === 'male' ? 'male' : 'female'"
                      :color="player.gender === 'male' ? 'blue' : 'pink'" size="sm" />
                    <span class="player-text">{{ player.name }}</span>
                    <div class="player-actions">
                      <q-btn dense flat round size="sm" icon="swap_horiz" :title="'สลับผู้เล่น'"
                        @click="openSwapDialog(match.id, player.id)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Winner Stays On Result Buttons -->
            <div v-if="isWinnerStaysOnMode && match.status === 'playing'" class="match-result-section">
              <!-- <div class="result-title">ผลการแข่งขัน</div> -->
              <div class="result-buttons">
                <!-- <q-btn color="secondary" label="สลับผู้เล่น" icon="swap_horiz" @click="openSwapDialogByCourt(match.id)"
                  :loading="loading" size="md" class="result-btn" flat /> -->
                <q-btn color="primary" label="จบเกมส์" icon="how_to_vote" @click="openWinnerDialog(match.id)"
                  :loading="loading" size="xl" class="big-end-btn" rounded unelevated />
              </div>
            </div>

            <!-- Match Completed Status -->
            <div v-if="match.status === 'completed'" class="match-completed">
              <q-icon name="check_circle" color="positive" size="md" />
              <span>ทีม {{ match.winner === 0 ? 'A' : 'B' }} ชนะ!</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Resting Players -->
    <div v-if="restingPlayers.length > 0" class="resting-display">
      <div class="resting-title">
        <q-icon name="chair" />
        ผู้เล่นที่พัก ({{ restingPlayers.length }} คน)
      </div>

      <div class="resting-players">
        <q-chip v-for="player in restingPlayers" :key="player.id"
          :color="player.gender === 'male' ? 'blue-grey' : 'purple'" text-color="white"
          :icon="player.gender === 'male' ? 'male' : 'female'">
          {{ player.name }}
          <span v-if="isWinnerStaysOnMode" class="rounds-count">({{ getPlayerRoundsPlayed(player.id) }} รอบ)</span>
          <q-btn class="q-ml-xs" dense flat round size="xs"
            :icon="isManuallyResting(player.id) ? 'play_arrow' : 'pause'"
            :title="isManuallyResting(player.id) ? 'ปลดพัก' : 'พักผู้เล่น'" @click="toggleManualRest(player.id)" />
        </q-chip>
      </div>
    </div>

    <!-- Swap Dialog -->
    <q-dialog v-model="swapDialog.open">
      <q-card class="swap-dialog-card" style="min-width: 320px; max-width: 420px;">
        <q-card-section class="text-h6">
          สลับผู้เล่น
        </q-card-section>
        <q-card-section>
          <div class="q-mb-sm">
            <q-option-group v-model="swapDialog.sourceMode" :options="swapSourceOptions" type="radio" inline dense />
          </div>
          <div class="q-mb-md">
            <q-select v-model="swapDialog.replacementId" :options="swapDialog.candidates" option-value="id"
              option-label="name" emit-value map-options outlined dense label="เลือกผู้เล่นที่เข้าแทน" />
          </div>
          <!-- <q-toggle v-model="swapDialog.restOut" label="พักผู้เล่นที่ออก" /> -->
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="ยกเลิก" color="grey" v-close-popup />
          <q-btn unelevated label="ยืนยัน" color="primary" @click="confirmSwap" :disable="!swapDialog.replacementId" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Winner Select Dialog -->
    <q-dialog v-model="winnerDialog.open">
      <q-card style="min-width: 320px; max-width: 420px;">
        <q-card-section class="text-h6">
          เลือกทีมที่ชนะ
        </q-card-section>
        <q-card-section>
          <div class="q-gutter-sm">
            <q-btn outline color="blue" class="full-width" :label="winnerDialog.labels.teamA" icon="military_tech"
              @click="confirmWinner(0)" />
            <q-btn outline color="purple" class="full-width" :label="winnerDialog.labels.teamB" icon="military_tech"
              @click="confirmWinner(1)" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="ยกเลิก" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Pair History Info -->
    <!-- <div v-if="hasActiveSession && currentMatches.length > 0" class="pair-history-info">
      <div class="history-title">
        <q-icon name="history" />
        ข้อมูล Session ปัจจุบัน
      </div>
      <div class="history-details">
        <q-chip color="info" text-color="white" icon="groups">
          ป้องกันการจับคู่ซ้ำ: เปิดใช้งาน
        </q-chip>
        <q-chip color="purple" text-color="white" icon="schedule">
          รอบที่ {{ currentRoundNumber }}
        </q-chip>
      </div>
    </div> -->

    <!-- Quick Access to Other Pages -->
    <div class="quick-links">
      <q-btn flat icon="group" label="จัดการผู้เล่น" to="/players" color="primary" />
      <q-btn flat icon="settings" label="ตั้งค่า" to="/settings" color="grey" />
      <!-- <q-btn
        v-if="hasActiveSession"
        flat
        icon="stop"
        label="จบ Session"
        @click="endSession"
        color="negative"
        :disable="loading"
      /> -->
    </div>

    <!-- Loading -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useBadmintonStore } from 'stores/badminton-store'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'
import { db } from 'boot/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

const badmintonStore = useBadmintonStore()
const authStore = useAuthStore()
const $q = useQuasar()

const loading = ref(false)

// Swap dialog state
const swapDialog = ref({
  open: false,
  matchId: null,
  outPlayerId: null,
  restOut: true,
  replacementId: null,
  candidates: [],
  sourceMode: 'resting'
})

const swapSourceOptions = [
  { label: 'เฉพาะผู้เล่นที่พักอยู่', value: 'resting' },
  { label: 'ผู้เล่นทั้งหมด', value: 'all' }
]

// Winner dialog state
const winnerDialog = ref({
  open: false,
  matchId: null,
  labels: {
    teamA: 'ทีม A ชนะ',
    teamB: 'ทีม B ชนะ'
  }
})

// Computed properties
const totalPlayers = computed(() => badmintonStore.totalPlayers)
const activePlayers = computed(() => badmintonStore.activePlayers)
const activeMalePlayers = computed(() => badmintonStore.activePlayers.filter(p => p.gender === 'male'))
const activeFemalePlayers = computed(() => badmintonStore.activePlayers.filter(p => p.gender === 'female'))
const gameSettings = computed(() => badmintonStore.gameSettings)
const currentMatches = computed(() => badmintonStore.currentMatches)
const restingPlayers = computed(() => badmintonStore.restingPlayers)
// Feature detection for manual rest (store may not provide it if disabled)
const hasManualRestFeature = computed(() => Array.isArray(badmintonStore.manualRestingPlayerIds) && typeof badmintonStore.toggleManualRest === 'function')
const hasActiveSession = computed(() => badmintonStore.hasActiveSession)
const currentRoundNumber = computed(() => badmintonStore.currentRoundNumber)

// Winner Stays On computed properties
const isWinnerStaysOnMode = computed(() => badmintonStore.isWinnerStaysOnMode)
const courtWinStreaks = computed(() => badmintonStore.courtWinStreaks)
const playerPlayStats = computed(() => badmintonStore.playerPlayStats)

// Functions
function getCourtColor(courtNumber) {
  const colors = ['primary', 'secondary', 'accent', 'positive', 'warning', 'info']
  return colors[(courtNumber - 1) % colors.length]
}

function getTeamA(match) {
  return match.players.slice(0, 2)
}

function getTeamB(match) {
  return match.players.slice(2, 4)
}
function isManuallyResting(playerId) {
  const list = badmintonStore.manualRestingPlayerIds
  return Array.isArray(list) ? list.includes(playerId) : false
}

// Manual rest toggle
function toggleManualRest(playerId) {
  if (typeof badmintonStore.toggleManualRest === 'function') {
    badmintonStore.toggleManualRest(playerId)
    const list = badmintonStore.manualRestingPlayerIds
    const nowRest = Array.isArray(list) ? list.includes(playerId) : false
    $q.notify({ type: nowRest ? 'warning' : 'positive', message: nowRest ? 'พักผู้เล่นแล้ว' : 'ปลดพักผู้เล่นแล้ว', position: 'top' })
  } else {
    $q.notify({ type: 'warning', message: 'ยังไม่ได้เปิดใช้ฟีเจอร์พักผู้เล่น', position: 'top' })
  }
}

// Open swap dialog
function openSwapDialog(matchId, outPlayerId) {
  swapDialog.value = {
    open: true,
    matchId,
    outPlayerId,
    restOut: true,
    replacementId: null,
    candidates: [],
    sourceMode: 'resting'
  }
  updateSwapCandidates()
}

function openSwapDialogByCourt(matchId) {
  // เปิด dialog แบบไม่ fix outPlayer ให้ผู้จัดเลือกใน select เอง
  swapDialog.value = {
    open: true,
    matchId,
    outPlayerId: null,
    restOut: true,
    replacementId: null,
    candidates: [],
    sourceMode: 'resting'
  }
  updateSwapCandidates()
}

function getSwapCandidatePool() {
  const mode = swapDialog.value.sourceMode
  const outId = swapDialog.value.outPlayerId
  let pool = []
  if (mode === 'resting') {
    pool = Array.isArray(restingPlayers.value) ? restingPlayers.value : []
  } else {
    pool = Array.isArray(activePlayers.value) ? activePlayers.value : []
  }
  return pool.filter(p => p && p.id !== outId)
}

function updateSwapCandidates() {
  const pool = getSwapCandidatePool()
  swapDialog.value.candidates = pool
  if (!pool.some(p => p.id === swapDialog.value.replacementId)) {
    swapDialog.value.replacementId = pool[0]?.id || null
  }
  if (pool.length === 0) {
    $q.notify({ type: 'warning', message: 'ยังไม่มีผู้เล่นว่างตามตัวเลือกที่เลือก', position: 'top' })
  }
}

watch(() => swapDialog.value.sourceMode, () => updateSwapCandidates())
watch(() => swapDialog.value.outPlayerId, () => updateSwapCandidates())

async function confirmSwap() {
  const { matchId, outPlayerId, replacementId, restOut } = swapDialog.value
  if (!replacementId) return
  if (typeof badmintonStore.replacePlayerInMatch === 'function') {
    const result = badmintonStore.replacePlayerInMatch(matchId, outPlayerId, replacementId, { restOutPlayer: restOut })
    if (result.success) {
      $q.notify({ type: 'positive', message: 'สลับผู้เล่นสำเร็จ', position: 'top' })
    } else {
      $q.notify({ type: 'negative', message: result.message || 'สลับผู้เล่นไม่สำเร็จ', position: 'top' })
    }
  } else {
    // Fallback: สลับใน currentMatches โดยตรง (รองรับข้ามคอร์ด)
    const matches = badmintonStore.currentMatches || []
    const matchAIndex = matches.findIndex(m => m.id === matchId)
    if (matchAIndex === -1) return
    const matchA = matches[matchAIndex]
    const outIdx = matchA.players.findIndex(p => p.id === outPlayerId)
    const inPlayer = (badmintonStore.players || badmintonStore.activePlayers || []).find(p => p.id === replacementId)
    if (outIdx === -1 || !inPlayer) return
    const otherMatchIndex = matches.findIndex(m => m.players?.some(p => p.id === replacementId))
    if (otherMatchIndex !== -1) {
      const matchB = matches[otherMatchIndex]
      const repIdx = matchB.players.findIndex(p => p.id === replacementId)
      const newA = [...matchA.players]
      const newB = [...matchB.players]
      const outPlayer = newA[outIdx]
      newA.splice(outIdx, 1, inPlayer)
      newB.splice(repIdx, 1, outPlayer)
      badmintonStore.currentMatches.splice(matchAIndex, 1, { ...matchA, players: newA })
      badmintonStore.currentMatches.splice(otherMatchIndex, 1, { ...matchB, players: newB })
    } else {
      const newA = [...matchA.players]
      newA.splice(outIdx, 1, inPlayer)
      badmintonStore.currentMatches.splice(matchAIndex, 1, { ...matchA, players: newA })
    }
    $q.notify({ type: 'positive', message: 'สลับผู้เล่นสำเร็จ', position: 'top' })
  }
  swapDialog.value.open = false
}

function openWinnerDialog(matchId) {
  winnerDialog.value.open = true
  winnerDialog.value.matchId = matchId
  // แสดงชื่อทีมพร้อมผู้เล่นแบบย่อเพื่อความเข้าใจ
  const match = currentMatches.value.find(m => m.id === matchId)
  if (match) {
    const teamA = match.players.slice(0, 2).map(p => p.name).join(' + ')
    const teamB = match.players.slice(2, 4).map(p => p.name).join(' + ')
    winnerDialog.value.labels.teamA = `ทีม A: ${teamA}`
    winnerDialog.value.labels.teamB = `ทีม B: ${teamB}`
  }
}

async function confirmWinner(teamIndex) {
  if (!winnerDialog.value.matchId) return
  await recordMatchResult(winnerDialog.value.matchId, teamIndex)
  winnerDialog.value.open = false
}

// Winner Stays On functions
function getCourtWinStreak(courtNumber) {
  return courtWinStreaks.value[courtNumber]
}

// ฟังก์ชันดึงจำนวนรอบที่ผู้เล่นเล่นไปแล้ว
function getPlayerRoundsPlayed(playerId) {
  if (!isWinnerStaysOnMode.value) return 0
  return badmintonStore.winnerStaysOnData.playerRounds[playerId] || 0
}

async function startWinnerStaysOn() {
  loading.value = true

  try {
    const result = badmintonStore.startWinnerStaysOnMode()

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: '🏆 เริ่มโหมด Winner Stays On แล้ว!',
        position: 'top',
        timeout: 2000
      })
    } else {
      $q.notify({
        type: 'negative',
        message: result.message,
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Error starting Winner Stays On mode:', error)
    $q.notify({
      type: 'negative',
      message: 'เกิดข้อผิดพลาดในการเริ่มโหมด',
      position: 'top'
    })
  }

  loading.value = false
}

async function stopWinnerStaysOn() {
  $q.dialog({
    title: 'หยุดโหมด Winner Stays On',
    message: 'ต้องการหยุดโหมด Winner Stays On หรือไม่?',
    ok: {
      label: 'หยุด',
      color: 'negative'
    },
    cancel: {
      label: 'ยกเลิก',
      color: 'grey'
    },
    persistent: true
  }).onOk(() => {
    const result = badmintonStore.stopWinnerStaysOnMode()
    badmintonStore.endSession()


    if (result.success) {
      $q.notify({
        type: 'warning',
        message: result.message,
        position: 'top'
      })
    }
  })
}

async function recordMatchResult(matchId, winnerTeam) {
  loading.value = true

  try {
    const result = badmintonStore.recordWinnerStaysOnResult(matchId, winnerTeam)

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: result.message,
        position: 'top',
        timeout: 3000
      })

      // Force reactive update
      await nextTick()

      // หน่วงเวลาเล็กน้อยเพื่อให้ผู้ใช้เห็นผล
      await new Promise(resolve => setTimeout(resolve, 1000))

    } else {
      $q.notify({
        type: 'negative',
        message: result.message || 'เกิดข้อผิดพลาดในการบันทึกผล',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Error recording match result:', error)
    $q.notify({
      type: 'negative',
      message: 'เกิดข้อผิดพลาดในการบันทึกผล',
      position: 'top'
    })
  }

  loading.value = false
}

// Firestore functions
const loadPlayersFromFirestore = async () => {
  if (authStore.isOfflineMode) return

  try {
    const playersRef = collection(db, 'players')
    const q = query(playersRef, where('userId', '==', authStore.userId))

    const querySnapshot = await getDocs(q)
    const firestorePlayers = []

    querySnapshot.forEach((doc) => {
      firestorePlayers.push({
        firestoreId: doc.id,
        ...doc.data()
      })
    })

    // Update local store with Firestore data
    badmintonStore.setPlayersFromFirestore(firestorePlayers)

    console.log(`IndexPage: Loaded ${firestorePlayers.length} players from Firestore`)
  } catch (error) {
    console.error('IndexPage: Error loading players:', error)
    // ไม่แสดง notification error เพราะอาจรบกวนผู้ใช้
  }
}

// Load data on component mount
onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.isOfflineMode) {
    // โหลด gameSettings จาก Firestore ก่อน (ถ้ายังไม่ได้โหลด)
    try {
      await badmintonStore.loadGameSettingsFromFirestore(authStore.userId)
    } catch (error) {
      console.error('Failed to load game settings:', error)
    }

    // ถ้ายังไม่มี players หรือมี session ที่ active อยู่ ไม่ต้อง reload จาก Firestore
    // เพื่อป้องกันการ overwrite ข้อมูลที่ persist ไว้
    if (badmintonStore.totalPlayers === 0 && !badmintonStore.hasActiveSession) {
      loadPlayersFromFirestore()
    }
  }
})



async function startNewRound() {
  loading.value = true

  try {
    const success = badmintonStore.startNewRound()

    if (success) {
      $q.notify({
        type: 'positive',
        message: `🔄 เริ่มรอบที่ ${badmintonStore.currentRoundNumber} แล้ว!`,
        position: 'top',
        timeout: 3000
      })
    } else {
      $q.notify({
        type: 'warning',
        message: 'ครบคู่แล้ว',
        position: 'top'
      })
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'เกิดข้อผิดพลาด: ' + error.message,
      position: 'top'
    })
  }

  loading.value = false
}

function endSession() {
  console.log('endSession clicked') // Debug log

  $q.dialog({
    title: 'จบ Session',
    message: 'คุณต้องการจบ session นี้หรือไม่? ประวัติการจับคู่จะถูกบันทึกและล้าง',
    ok: {
      label: 'จบ Session',
      color: 'negative'
    },
    cancel: {
      label: 'ยกเลิก',
      color: 'primary'
    },
    persistent: true
  }).onOk(() => {
    try {
      console.log('Ending session...') // Debug log
      badmintonStore.endSession()
      $q.notify({
        type: 'positive',
        message: '✅ จบ Session แล้ว! ประวัติถูกบันทึกเรียบร้อย',
        position: 'top',
        timeout: 3000
      })
    } catch (error) {
      console.error('Error ending session:', error) // Debug log
      $q.notify({
        type: 'negative',
        message: 'เกิดข้อผิดพลาด: ' + error.message,
        position: 'top'
      })
    }
  })
}
</script>

<style scoped>
.simple-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* Header */
.simple-header {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
}

.player-count {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
}

.gender-count {
  display: flex;
  align-items: center;
  gap: 6px;
}

.court-count,
.round-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count-text {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

/* No Players Section */
.no-players-section {
  margin-bottom: 30px;
}

.no-players-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 2px dashed #e0e0e0;
}

/* Not Enough Players Section */
.not-enough-section {
  margin-bottom: 30px;
}

.not-enough-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #ffa726;
}

/* Round Management */
.round-management {
  margin-bottom: 20px;
}

.round-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* Session Management */
.session-management {
  margin-bottom: 20px;
  text-align: center;
}

.session-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 30px;
  align-items: center;
}

.main-action-btn {
  min-height: 60px;
  font-size: 18px;
  font-weight: bold;
  width: 100%;
  max-width: 300px;
}

.rematch-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  align-items: center;
}

.option-section {
  text-align: center;
  width: 100%;
  max-width: 350px;
}

.smart-action-btn,
.random-action-btn {
  min-height: 50px;
  font-size: 16px;
  width: 100%;
  margin-bottom: 8px;
}

.option-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  padding: 0 16px;
}

/* Matches Display */
.matches-display {
  margin-bottom: 30px;
}

.matches-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
  justify-content: center;
}

.courts-grid {
  display: grid;
  gap: 20px;
}

.court-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #1976d2;
}

.court-header {
  text-align: center;
  margin-bottom: 20px;
}

.teams-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
}

.team {
  text-align: center;
}

.team-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
}

.players {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-name {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  font-size: 14px;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 8px;
  min-height: 40px;
  /* ให้สูงพอรองรับ 2 บรรทัดโดยไม่ดันการ์ดคอร์ด */
}

.player-actions {
  display: inline-flex;
  margin-left: 6px;
}

/* บังคับชื่อผู้เล่นให้ตัดคำและจำกัดจำนวนบรรทัด เพื่อความสูงสม่ำเสมอ */
.player-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
  line-height: 1.2;
  text-align: left;
}

.vs-separator {
  font-size: 14px;
  font-weight: bold;
  color: #666;
  background: #f0f0f0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Resting Players */
.resting-display {
  margin-bottom: 30px;
}

.resting-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #666;
  margin-bottom: 16px;
  justify-content: center;
}

.resting-players {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

/* Pair History Info */
.pair-history-info {
  margin-bottom: 30px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #666;
  margin-bottom: 12px;
  justify-content: center;
}

.history-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

/* Quick Links */
.quick-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
}

/* Responsive */
@media (min-width: 600px) {
  .courts-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .action-buttons {
    flex-direction: row;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .simple-header.compact-mobile {
    flex-direction: row;
    gap: 12px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border-radius: 12px;
  }

  .simple-header.compact-mobile .count-text {
    font-size: 14px;
    font-weight: 600;
  }

  .simple-header.compact-mobile .gender-count,
  .simple-header.compact-mobile .court-count,
  .simple-header.compact-mobile .round-info {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .simple-header.compact-mobile .player-count {
    gap: 8px;
  }

  .round-actions {
    flex-direction: row;
    justify-content: center;
    gap: 12px;
  }

  /* Court Cards Mobile Optimization */
  .court-card {
    margin-bottom: 16px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .court-card .q-card-section {
    padding: 12px;
  }

  .court-header {
    margin-bottom: 12px;
  }

  .court-header .q-chip {
    font-size: 13px;
    padding: 4px 8px;
  }

  .teams-container {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .team {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 8px;
  }

  .team-name {
    font-size: 14px;
    margin-bottom: 8px;
  }

  .team-name .q-chip {
    font-size: 11px;
    padding: 2px 6px;
  }

  .player-name {
    font-size: 12px;
    padding: 6px;
    min-height: 32px;
    border-radius: 6px;
  }

  .player-text {
    font-size: 12px;
    max-width: 140px;
  }

  .vs-separator {
    width: 32px;
    height: 32px;
    font-size: 12px;
    margin: 4px auto;
  }

  .match-result-section {
    margin-top: 12px;
    padding: 12px;
    border-radius: 6px;
  }

  .big-end-btn {
    min-height: 44px;
    font-size: 14px;
  }
}

/* Winner Stays On Styles */
.winner-stays-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  border-radius: 12px;
  color: white;
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-text {
  font-size: 18px;
  font-weight: bold;
}

.winning-team {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%);
  border: 2px solid #4caf50;
}

.match-result-section {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-top: 1px solid #e0e0e0;
}

.result-title {
  text-align: center;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  font-size: 14px;
}

.result-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.result-btn {
  flex: 1;
  max-width: 140px;
}

.big-end-btn {
  width: 100%;
  max-width: 320px;
  min-height: 56px;
  font-size: 18px;
  font-weight: bold;
}

/* Compact swap dialog for mobile */
.swap-dialog-card {
  padding: 8px;
}

@media (max-width: 480px) {
  .swap-dialog-card {
    min-width: 280px !important;
    max-width: 320px !important;
  }

  .swap-dialog-card .q-card__section {
    padding: 8px 12px;
  }

  .swap-dialog-card .q-option-group {
    font-size: 12px;
  }
}

.match-completed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  color: white;
  border-radius: 8px;
  font-weight: bold;
}

/* Rounds count style */
.rounds-count {
  margin-left: 6px;
  font-size: 0.85em;
  opacity: 0.9;
  font-weight: normal;
}

@media (max-width: 768px) {
  .winner-stays-controls {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .result-buttons {
    flex-direction: column;
  }

  .result-btn {
    max-width: none;
  }
}
</style>

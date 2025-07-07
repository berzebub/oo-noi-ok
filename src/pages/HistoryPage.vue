<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h4">ประวัติการเล่น</div>
        <div class="text-subtitle2 text-grey-7">สถิติและประวัติการเล่นแบดมินตัน</div>
      </div>
      <div class="col-auto">
        <q-btn color="negative" label="ล้างประวัติ" icon="delete" @click="confirmClearHistory" />
      </div>
    </div>

    <!-- Statistics Overview -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-md-3">
        <q-card class="modern-card stats-card">
          <q-card-section class="text-center">
            <q-icon name="sports_tennis" size="3rem" color="primary" />
            <div class="text-h4 text-primary q-mt-sm">{{ totalSessions }}</div>
            <div class="text-grey-7">เซสชั่นทั้งหมด</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="modern-card stats-card">
          <q-card-section class="text-center">
            <q-icon name="schedule" size="3rem" color="orange" />
            <div class="text-h4 text-orange q-mt-sm">{{ totalHours }}</div>
            <div class="text-grey-7">ชั่วโมงรวม</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="modern-card stats-card">
          <q-card-section class="text-center">
            <q-icon name="payments" size="3rem" color="green" />
            <div class="text-h4 text-green q-mt-sm">{{ totalSpent }}</div>
            <div class="text-grey-7">บาทที่ใช้</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="modern-card stats-card">
          <q-card-section class="text-center">
            <q-icon name="trending_up" size="3rem" color="blue" />
            <div class="text-h4 text-blue q-mt-sm">{{ averagePerSession }}</div>
            <div class="text-grey-7">บาท/เซสชั่น</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Player Statistics -->
    <q-card class="q-mb-lg modern-card">
      <q-card-section class="bg-blue-1">
        <div class="text-h6">
          <q-icon name="leaderboard" class="q-mr-sm" />
          สถิติผู้เล่น
        </div>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="playerStats"
          :columns="playerStatsColumns"
          row-key="id"
          :pagination="{ rowsPerPage: 10 }"
          flat
        >
          <template v-slot:body-cell-player="props">
            <q-td :props="props">
              <div class="row items-center no-wrap">
                <q-icon
                  :name="props.row.gender === 'male' ? 'male' : 'female'"
                  :color="props.row.gender === 'male' ? 'blue' : 'pink'"
                  size="sm"
                  class="q-mr-sm"
                />
                <span class="text-weight-medium">{{ props.row.name }}</span>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-rank="props">
            <q-td :props="props">
              <q-chip
                :color="getRankColor(props.row.rank)"
                :icon="getRankIcon(props.row.rank)"
                :label="props.row.rank"
                size="sm"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Session History -->
    <q-card class="modern-card">
      <q-card-section class="bg-purple-1">
        <div class="text-h6">
          <q-icon name="history" class="q-mr-sm" />
          ประวัติเซสชั่น
        </div>
      </q-card-section>

      <q-card-section>
        <div v-if="gameHistory.length === 0" class="text-center text-grey-6 q-py-xl">
          <q-icon name="history" size="4rem" class="q-mb-md" />
          <div class="text-h6">ยังไม่มีประวัติการเล่น</div>
          <div class="text-subtitle2">เริ่มเซสชั่นแรกของคุณได้เลย!</div>
        </div>

        <div v-else>
          <q-timeline color="primary" class="q-pa-md">
            <q-timeline-entry
              v-for="(session, index) in gameHistory"
              :key="session.id"
              :title="`เซสชั่น ${gameHistory.length - index}`"
              :subtitle="formatDate(session.startTime)"
              :icon="getSessionIcon(session)"
              :color="getSessionColor(session)"
            >
              <div class="session-card">
                <div class="session-header">
                  <div class="session-info">
                    <div class="session-time">
                      {{ formatTime(session.startTime) }} - {{ formatTime(session.endTime) }}
                    </div>
                    <div class="session-duration">
                      ระยะเวลา: {{ getSessionDuration(session) }} นาที
                    </div>
                  </div>
                  <div class="session-cost">
                    <div class="cost-amount">{{ session.totalCost }} บาท</div>
                    <div class="cost-per-person">{{ Math.round(session.totalCost / session.participants.length) }} บาท/คน</div>
                  </div>
                </div>

                <div class="session-details">
                  <div class="detail-item">
                    <q-icon name="group" color="blue" />
                    <span>{{ session.participants.length }} คน</span>
                  </div>
                  <div class="detail-item">
                    <q-icon name="sports_tennis" color="orange" />
                    <span>{{ session.settings.courts }} คอร์ด</span>
                  </div>
                  <div class="detail-item">
                    <q-icon name="timer" color="green" />
                    <span>{{ session.rounds.length }} รอบ</span>
                  </div>
                </div>

                <q-expansion-item
                  label="รายละเอียดเพิ่มเติม"
                  icon="more_horiz"
                  class="q-mt-sm"
                >
                  <div class="expansion-content">
                    <div class="participants-list">
                      <div class="text-subtitle2 q-mb-sm">ผู้เล่น:</div>
                      <div class="row q-gutter-xs">
                        <q-chip
                          v-for="participant in session.participants"
                          :key="participant.id"
                          :color="participant.gender === 'male' ? 'blue' : 'pink'"
                          :icon="participant.gender === 'male' ? 'male' : 'female'"
                          :label="participant.name"
                          size="sm"
                          text-color="white"
                        />
                      </div>
                    </div>

                    <div class="rounds-summary q-mt-md" v-if="session.rounds.length > 0">
                      <div class="text-subtitle2 q-mb-sm">รอบการเล่น:</div>
                      <div class="row q-gutter-sm">
                        <div
                          v-for="round in session.rounds"
                          :key="round.roundNumber"
                          class="round-item"
                        >
                          <div class="round-number">รอบ {{ round.roundNumber }}</div>
                          <div class="round-matches">{{ round.matches.length }} คอร์ด</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </q-expansion-item>
              </div>
            </q-timeline-entry>
          </q-timeline>
        </div>
      </q-card-section>
    </q-card>

    <!-- Clear History Dialog -->
    <q-dialog v-model="showClearConfirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">ต้องการล้างประวัติการเล่นทั้งหมดหรือไม่?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="ยกเลิก" color="primary" v-close-popup />
          <q-btn flat label="ล้างประวัติ" color="negative" @click="clearHistory" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import { useBadmintonStore } from 'src/stores/badminton-store'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'HistoryPage',

  setup() {
    const $q = useQuasar()
    const badmintonStore = useBadmintonStore()
    const { players, gameHistory } = storeToRefs(badmintonStore)

    const showClearConfirm = ref(false)

    const playerStatsColumns = [
      { name: 'rank', label: 'อันดับ', align: 'center', field: 'rank' },
      { name: 'player', label: 'ผู้เล่น', align: 'left', field: 'name', sortable: true },
      { name: 'gamesPlayed', label: 'เกมที่เล่น', align: 'center', field: 'gamesPlayed', sortable: true },
      { name: 'totalPlayTime', label: 'ชั่วโมงรวม', align: 'center', field: 'totalPlayTime', sortable: true },
      { name: 'avgPerGame', label: 'เฉลี่ย/เกม', align: 'center', field: 'avgPerGame', sortable: true }
    ]

    const totalSessions = computed(() => gameHistory.value.length)

    const totalHours = computed(() => {
      return gameHistory.value.reduce((sum, session) => {
        return sum + session.settings.hoursPerSession
      }, 0)
    })

    const totalSpent = computed(() => {
      return gameHistory.value.reduce((sum, session) => sum + session.totalCost, 0)
    })

    const averagePerSession = computed(() => {
      if (totalSessions.value === 0) return 0
      return Math.round(totalSpent.value / totalSessions.value)
    })

    const playerStats = computed(() => {
      const stats = players.value.map(player => ({
        ...player,
        avgPerGame: player.gamesPlayed > 0 ? Math.round(player.totalPlayTime / player.gamesPlayed * 100) / 100 : 0
      }))

      // เรียงตามจำนวนเกมที่เล่น
      stats.sort((a, b) => b.gamesPlayed - a.gamesPlayed)

      // เพิ่มอันดับ
      return stats.map((player, index) => ({
        ...player,
        rank: index + 1
      }))
    })

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const formatTime = (date) => {
      return new Date(date).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const getSessionDuration = (session) => {
      if (!session.endTime) return 0
      return Math.round((new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60))
    }

    const getSessionIcon = (session) => {
      if (session.rounds.length >= 8) return 'emoji_events'
      if (session.rounds.length >= 5) return 'star'
      return 'sports_tennis'
    }

    const getSessionColor = (session) => {
      if (session.rounds.length >= 8) return 'positive'
      if (session.rounds.length >= 5) return 'orange'
      return 'primary'
    }

    const getRankColor = (rank) => {
      if (rank === 1) return 'amber'
      if (rank <= 3) return 'grey-6'
      if (rank <= 5) return 'brown'
      return 'grey'
    }

    const getRankIcon = (rank) => {
      if (rank === 1) return 'emoji_events'
      if (rank <= 3) return 'star'
      return 'person'
    }

    const confirmClearHistory = () => {
      showClearConfirm.value = true
    }

    const clearHistory = () => {
      badmintonStore.gameHistory = []

      $q.notify({
        type: 'negative',
        message: 'ล้างประวัติการเล่นแล้ว',
        position: 'top'
      })
    }

    return {
      players,
      gameHistory,
      showClearConfirm,
      playerStatsColumns,
      totalSessions,
      totalHours,
      totalSpent,
      averagePerSession,
      playerStats,
      formatDate,
      formatTime,
      getSessionDuration,
      getSessionIcon,
      getSessionColor,
      getRankColor,
      getRankIcon,
      confirmClearHistory,
      clearHistory
    }
  }
})
</script>

<style scoped>
.modern-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.session-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #1976d2;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.session-info {
  flex: 1;
}

.session-time {
  font-weight: bold;
  font-size: 16px;
  color: #1976d2;
}

.session-duration {
  font-size: 12px;
  color: #666;
}

.session-cost {
  text-align: right;
}

.cost-amount {
  font-weight: bold;
  font-size: 18px;
  color: #2e7d32;
}

.cost-per-person {
  font-size: 12px;
  color: #666;
}

.session-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.expansion-content {
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
}

.participants-list .row {
  max-height: 100px;
  overflow-y: auto;
}

.round-item {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  text-align: center;
  min-width: 60px;
}

.round-number {
  font-size: 10px;
  color: #666;
}

.round-matches {
  font-size: 12px;
  font-weight: bold;
  color: #1976d2;
}
</style>

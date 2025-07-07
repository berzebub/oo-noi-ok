<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h4">จับคู่การเล่น</div>
        <div class="text-subtitle2 text-grey-7">ระบบจับคู่อัตโนมัติป้องกันคู่ซ้ำ</div>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          label="สร้างการจับคู่ใหม่"
          icon="shuffle"
          @click="generateNewMatches"
          :disable="activePlayers.length < 4"
        />
      </div>
    </div>

    <!-- Player Selection -->
    <q-card class="q-mb-lg modern-card">
      <q-card-section class="bg-blue-1">
        <div class="text-h6">
          <q-icon name="group" class="q-mr-sm" />
          เลือกผู้เล่น ({{ selectedPlayers.length }}/{{ maxPlayers }})
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-sm">
          <div
            v-for="player in players"
            :key="player.id"
            class="col-auto"
          >
            <q-chip
              :model-value="selectedPlayers.includes(player.id)"
              @update:model-value="togglePlayer(player)"
              clickable
              :color="getPlayerChipColor(player)"
              :text-color="selectedPlayers.includes(player.id) ? 'white' : 'grey-8'"
              :icon="player.gender === 'male' ? 'male' : 'female'"
              :label="player.name"
              size="md"
              class="player-chip"
            />
          </div>
        </div>

        <div class="row q-gutter-md q-mt-md">
          <div class="col-auto">
            <q-btn
              flat
              color="positive"
              label="เลือกทั้งหมด"
              icon="select_all"
              @click="selectAllPlayers"
              size="sm"
            />
          </div>
          <div class="col-auto">
            <q-btn
              flat
              color="negative"
              label="ยกเลิกทั้งหมด"
              icon="clear"
              @click="clearAllPlayers"
              size="sm"
            />
          </div>
          <div class="col-auto">
            <q-btn
              flat
              color="primary"
              label="เลือกแบบสุ่ม"
              icon="casino"
              @click="selectRandomPlayers"
              size="sm"
            />
          </div>
        </div>

        <q-banner v-if="activePlayers.length < 4" class="bg-warning text-black q-mt-md">
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          ต้องการผู้เล่นอย่างน้อย 4 คนเพื่อเริ่มการจับคู่
        </q-banner>
      </q-card-section>
    </q-card>

    <!-- Algorithm Settings -->
    <q-card class="q-mb-lg modern-card" v-if="activePlayers.length >= 4">
      <q-card-section class="bg-purple-1">
        <div class="text-h6">
          <q-icon name="tune" class="q-mr-sm" />
          การตั้งค่าอัลกอริทึม
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-lg">
          <div class="col-12 col-md-4">
            <q-slider
              v-model="algorithmSettings.mixedGenderWeight"
              :min="0"
              :max="10"
              label
              :label-value="`คู่ผสม: ${algorithmSettings.mixedGenderWeight}`"
              color="purple"
            />
          </div>

          <div class="col-12 col-md-4">
            <q-slider
              v-model="algorithmSettings.experienceBalanceWeight"
              :min="0"
              :max="10"
              label
              :label-value="`สมดุลประสบการณ์: ${algorithmSettings.experienceBalanceWeight}`"
              color="orange"
            />
          </div>

          <div class="col-12 col-md-4">
            <q-slider
              v-model="algorithmSettings.avoidRepeatWeight"
              :min="0"
              :max="20"
              label
              :label-value="`ป้องกันซ้ำ: ${algorithmSettings.avoidRepeatWeight}`"
              color="red"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Current Matches -->
    <q-card v-if="currentMatches.length > 0" class="q-mb-lg modern-card">
      <q-card-section class="bg-green-1">
        <div class="text-h6">
          <q-icon name="sports_tennis" class="q-mr-sm" />
          การจับคู่ปัจจุบัน
          <q-chip
            color="info"
            size="sm"
            :label="`คะแนนรวม: ${totalMatchScore}`"
            class="q-ml-sm"
          />
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <div
            v-for="match in currentMatches"
            :key="match.courtNumber"
            class="col-12 col-md-6 col-lg-4"
          >
            <q-card bordered class="match-card">
              <q-card-section class="bg-primary text-white">
                <div class="text-center">
                  <div class="text-h6">คอร์ด {{ match.courtNumber }}</div>
                  <q-chip
                    :color="getMatchTypeColor(match.type)"
                    :label="getMatchTypeLabel(match.type)"
                    size="sm"
                    class="q-mt-xs"
                  />
                  <q-chip
                    color="grey-3"
                    text-color="grey-8"
                    :label="`คะแนน: ${match.score || 0}`"
                    size="sm"
                    class="q-ml-xs"
                  />
                </div>
              </q-card-section>

              <q-card-section>
                <div class="row q-gutter-md">
                  <div class="col-6">
                    <div class="team-section">
                      <div class="team-header text-blue">ทีม A</div>
                      <div
                        v-for="player in match.players.slice(0, 2)"
                        :key="player.id"
                        class="player-name"
                      >
                        <q-icon
                          :name="player.gender === 'male' ? 'male' : 'female'"
                          :color="player.gender === 'male' ? 'blue' : 'pink'"
                          size="xs"
                          class="q-mr-xs"
                        />
                        {{ player.name }}
                      </div>
                    </div>
                  </div>

                  <div class="col-6">
                    <div class="team-section">
                      <div class="team-header text-red">ทีม B</div>
                      <div
                        v-for="player in match.players.slice(2, 4)"
                        :key="player.id"
                        class="player-name"
                      >
                        <q-icon
                          :name="player.gender === 'male' ? 'male' : 'female'"
                          :color="player.gender === 'male' ? 'blue' : 'pink'"
                          size="xs"
                          class="q-mr-xs"
                        />
                        {{ player.name }}
                      </div>
                    </div>
                  </div>
                </div>
              </q-card-section>

              <!-- Match Actions -->
              <q-card-actions align="center">
                <q-btn
                  flat
                  size="sm"
                  color="orange"
                  label="สลับทีม"
                  icon="swap_horiz"
                  @click="swapTeams(match.courtNumber)"
                />
                <q-btn
                  flat
                  size="sm"
                  color="purple"
                  label="สลับผู้เล่น"
                  icon="shuffle"
                  @click="shufflePlayers(match.courtNumber)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Pair History Analytics -->
    <q-card v-if="hasActiveSession && pairHistory.length > 0" class="q-mb-lg modern-card">
      <q-card-section class="bg-orange-1">
        <div class="text-h6">
          <q-icon name="analytics" class="q-mr-sm" />
          การวิเคราะห์คู่ในเซสชั่น
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col-12 col-md-8">
            <div class="text-subtitle2 q-mb-sm">ประวัติคู่ที่เล่นด้วยกัน</div>
            <div class="row q-gutter-xs">
              <div
                v-for="pair in pairHistory.slice(0, 12)"
                :key="`${pair.player1}-${pair.player2}`"
                class="col-auto"
              >
                <q-chip
                  :color="getPairHistoryColor(pair.count)"
                  :label="`${pair.player1} + ${pair.player2} (${pair.count})`"
                  size="sm"
                />
              </div>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="stats-box">
              <div class="stat-item">
                <div class="stat-value">{{ uniquePairs }}</div>
                <div class="stat-label">คู่ที่แตกต่าง</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ maxPairCount }}</div>
                <div class="stat-label">เล่นด้วยกันสูงสุด</div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Alternative Matches -->
    <q-card v-if="alternativeMatches.length > 0" class="modern-card">
      <q-card-section class="bg-grey-2">
        <div class="text-h6">
          <q-icon name="alt_route" class="q-mr-sm" />
          ตัวเลือกการจับคู่อื่น
        </div>
      </q-card-section>

      <q-card-section>
        <q-list separator>
          <q-item
            v-for="(matchSet, index) in alternativeMatches.slice(0, 3)"
            :key="index"
            clickable
            @click="useAlternativeMatch(matchSet)"
            class="alternative-match-item"
          >
            <q-item-section>
              <q-item-label>ตัวเลือก {{ index + 1 }}</q-item-label>
              <q-item-label caption>
                คะแนน: {{ matchSet.totalScore }} |
                คู่ผสม: {{ matchSet.mixedCount }}/{{ gameSettings.courts }} |
                คู่ซ้ำ: {{ matchSet.repeatCount }}
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-btn
                flat
                round
                icon="arrow_forward"
                color="primary"
                size="sm"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed, watch } from 'vue'
import { useBadmintonStore } from 'src/stores/badminton-store'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'MatchingPage',

  setup() {
    const $q = useQuasar()
    const badmintonStore = useBadmintonStore()
    const {
      players,
      activePlayers,
      currentMatches,
      gameSettings,
      hasActiveSession,
      currentSession
    } = storeToRefs(badmintonStore)

    const selectedPlayers = ref([])
    const alternativeMatches = ref([])

    const algorithmSettings = ref({
      mixedGenderWeight: 5,
      experienceBalanceWeight: 3,
      avoidRepeatWeight: 10
    })

    const maxPlayers = computed(() => gameSettings.value.courts * 4)

    const pairHistory = computed(() => {
      return badmintonStore.getPairHistory()
    })

    const uniquePairs = computed(() => pairHistory.value.length)
    const maxPairCount = computed(() =>
      pairHistory.value.length > 0 ? Math.max(...pairHistory.value.map(p => p.count)) : 0
    )

    const totalMatchScore = computed(() => {
      return currentMatches.value.reduce((sum, match) => sum + (match.score || 0), 0)
    })

    // เริ่มต้นด้วยการเลือกผู้เล่นที่ active
    watch(activePlayers, (newActivePlayers) => {
      selectedPlayers.value = newActivePlayers.map(p => p.id)
    }, { immediate: true })

    const togglePlayer = (player) => {
      const index = selectedPlayers.value.indexOf(player.id)
      if (index > -1) {
        selectedPlayers.value.splice(index, 1)
        badmintonStore.togglePlayerActive(player.id)
      } else if (selectedPlayers.value.length < maxPlayers.value) {
        selectedPlayers.value.push(player.id)
        if (!player.isActive) {
          badmintonStore.togglePlayerActive(player.id)
        }
      } else {
        $q.notify({
          type: 'warning',
          message: `สามารถเลือกได้สูงสุด ${maxPlayers.value} คน`,
          position: 'top'
        })
      }
    }

    const selectAllPlayers = () => {
      const available = players.value.slice(0, maxPlayers.value)
      selectedPlayers.value = available.map(p => p.id)

      // อัพเดทสถานะ active
      players.value.forEach(player => {
        const shouldBeActive = selectedPlayers.value.includes(player.id)
        if (player.isActive !== shouldBeActive) {
          badmintonStore.togglePlayerActive(player.id)
        }
      })
    }

    const clearAllPlayers = () => {
      selectedPlayers.value.forEach(playerId => {
        const player = players.value.find(p => p.id === playerId)
        if (player?.isActive) {
          badmintonStore.togglePlayerActive(playerId)
        }
      })
      selectedPlayers.value = []
    }

    const selectRandomPlayers = () => {
      const shuffled = [...players.value].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, maxPlayers.value)

      clearAllPlayers()
      selectedPlayers.value = selected.map(p => p.id)

      selected.forEach(player => {
        if (!player.isActive) {
          badmintonStore.togglePlayerActive(player.id)
        }
      })

      $q.notify({
        type: 'info',
        message: `เลือกผู้เล่นแบบสุ่ม ${selected.length} คน`,
        position: 'top'
      })
    }

    const generateNewMatches = () => {
      const matches = badmintonStore.generateMatches()

      if (matches.length > 0) {
        // สร้างตัวเลือกอื่น
        generateAlternativeMatches()

        $q.notify({
          type: 'positive',
          message: `สร้างการจับคู่ ${matches.length} คอร์ด สำเร็จ!`,
          position: 'top',
          icon: 'shuffle'
        })
      } else {
        $q.notify({
          type: 'warning',
          message: 'ไม่สามารถสร้างการจับคู่ได้',
          position: 'top'
        })
      }
    }

    const generateAlternativeMatches = () => {
      // จำลองการสร้างตัวเลือกอื่น (ในการใช้งานจริงจะใช้อัลกอริทึมที่ซับซ้อนกว่านี้)
      alternativeMatches.value = []

      for (let i = 0; i < 3; i++) {
        const mockMatches = currentMatches.value.map(match => ({
          ...match,
          players: [...match.players].sort(() => Math.random() - 0.5)
        }))

        const totalScore = Math.floor(Math.random() * 50) - 25
        const mixedCount = mockMatches.filter(m =>
          new Set(m.players.map(p => p.gender)).size === 2
        ).length
        const repeatCount = Math.floor(Math.random() * 3)

        alternativeMatches.value.push({
          matches: mockMatches,
          totalScore,
          mixedCount,
          repeatCount
        })
      }
    }

    const useAlternativeMatch = (matchSet) => {
      badmintonStore.currentMatches = matchSet.matches

      $q.notify({
        type: 'info',
        message: 'ใช้การจับคู่ทางเลือก',
        position: 'top'
      })
    }

    const swapTeams = (courtNumber) => {
      const match = currentMatches.value.find(m => m.courtNumber === courtNumber)
      if (match) {
        // สลับทีม A และ B
        const teamA = match.players.slice(0, 2)
        const teamB = match.players.slice(2, 4)
        match.players = [...teamB, ...teamA]

        $q.notify({
          type: 'info',
          message: `สลับทีมคอร์ด ${courtNumber}`,
          position: 'top'
        })
      }
    }

    const shufflePlayers = (courtNumber) => {
      const match = currentMatches.value.find(m => m.courtNumber === courtNumber)
      if (match) {
        // สุ่มผู้เล่นใหม่
        match.players = match.players.sort(() => Math.random() - 0.5)

        $q.notify({
          type: 'info',
          message: `สลับผู้เล่นคอร์ด ${courtNumber}`,
          position: 'top'
        })
      }
    }

    const getPlayerChipColor = (player) => {
      if (selectedPlayers.value.includes(player.id)) {
        return player.gender === 'male' ? 'blue' : 'pink'
      }
      return 'grey-3'
    }

    const getMatchTypeColor = (type) => {
      switch(type) {
        case 'mixed': return 'purple'
        case 'male': return 'blue'
        case 'female': return 'pink'
        default: return 'grey'
      }
    }

    const getMatchTypeLabel = (type) => {
      switch(type) {
        case 'mixed': return 'คู่ผสม'
        case 'male': return 'ชาย-ชาย'
        case 'female': return 'หญิง-หญิง'
        default: return 'ทั่วไป'
      }
    }

    const getPairHistoryColor = (count) => {
      if (count === 1) return 'positive'
      if (count === 2) return 'warning'
      return 'negative'
    }

    return {
      players,
      activePlayers,
      currentMatches,
      gameSettings,
      hasActiveSession,
      selectedPlayers,
      alternativeMatches,
      algorithmSettings,
      maxPlayers,
      pairHistory,
      uniquePairs,
      maxPairCount,
      totalMatchScore,
      togglePlayer,
      selectAllPlayers,
      clearAllPlayers,
      selectRandomPlayers,
      generateNewMatches,
      useAlternativeMatch,
      swapTeams,
      shufflePlayers,
      getPlayerChipColor,
      getMatchTypeColor,
      getMatchTypeLabel,
      getPairHistoryColor
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

.player-chip {
  transition: all 0.3s ease;
  margin: 2px;
}

.player-chip:hover {
  transform: scale(1.05);
}

.match-card {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.match-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.team-section {
  padding: 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
}

.team-header {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  text-align: center;
}

.player-name {
  font-size: 12px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.stats-box {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.stat-item {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  min-width: 80px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1976d2;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.alternative-match-item {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.alternative-match-item:hover {
  background: rgba(25, 118, 210, 0.05);
  transform: translateX(4px);
}
</style>

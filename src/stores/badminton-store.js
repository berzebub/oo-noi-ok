import { defineStore } from 'pinia'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from 'boot/firebase'

export const useBadmintonStore = defineStore('badminton', {
  persist: {
    key: 'badminton-store',
    storage: localStorage,
    paths: ['players', 'gameSettings', 'currentSession', 'currentMatches', 'waitingPlayers', 'winnerStaysOnData']
  },
  state: () => ({
    // ข้อมูลผู้เล่น
    players: [],

    // การตั้งค่าการเล่น
    gameSettings: {
      courts: 2,           // จำนวนคอร์ด
      hoursPerSession: 2,  // ชั่วโมงต่อเซสชั่น
      pricePerCourtHour: 180, // ราคาคอร์ดต่อชั่วโมง
      shuttlecockPrice: 90,   // ราคาลูกต่อลูก
      shuttlecockCount: 3,    // จำนวนลูกที่ใช้
      roundDuration: 15,       // นาทีต่อรอบ
      gameMode: 'normal', // 'normal', 'tournament', 'winnerStaysOn'
      winnerStaysOnWins: 2    // จำนวนเกมส์ที่ทีมชนะอยู่ต่อได้
    },

    // ข้อมูล Session ปัจจุบัน
    currentSession: {
      id: null,
      startTime: null,
      endTime: null,
      participants: [],
      rounds: [],           // เก็บรอบการเล่นทั้งหมด
      currentRound: 0,      // รอบปัจจุบัน
      pairHistory: {}, // เก็บประวัติคู่ที่เล่นด้วยกันแล้ว
      totalCost: 0,
      mode: 'normal',
      tournament: {
        brackets: [],
        winners: [],
        currentStage: 'group'
      }
    },

    // การจับคู่ปัจจุบัน
    currentMatches: [],

    // ประวัติการเล่นทั้งหมด
    gameHistory: [],

    waitingPlayers: [], // ผู้เล่นที่รอคิว

    // Winner Stays On Mode
    winnerStaysOnData: {
      isActive: false,
      courtWinStreaks: {}, // { courtNumber: { teamIndex: 0|1, winCount: 0, teamPlayers: [...] } }
      matchHistory: [], // เก็บประวัติการแข่งขันแต่ละเกมส์
      playerRounds: {} // เก็บจำนวนรอบที่แต่ละคนเล่น { playerId: roundCount }
    }
  }),

  getters: {
    // ผู้เล่นชาย
    malePlayers: (state) => state.players.filter(p => p.gender === 'male'),

    // ผู้เล่นหญิง
    femalePlayers: (state) => state.players.filter(p => p.gender === 'female'),

    // จำนวนผู้เล่นทั้งหมด
    totalPlayers: (state) => state.players.length,

    // ผู้เล่นที่อยู่ในเซสชั่นปัจจุบัน
    activePlayers: (state) => state.players.filter(p => p.isActive),

    // คำนวณค่าใช้จ่ายรวม
    totalCost: (state) => {
      const courtCost = state.gameSettings.courts *
        state.gameSettings.hoursPerSession *
        state.gameSettings.pricePerCourtHour
      const shuttleCost = state.gameSettings.shuttlecockCount *
        state.gameSettings.shuttlecockPrice
      return courtCost + shuttleCost
    },

    // ค่าใช้จ่ายต่อคน
    costPerPlayer: (state) => {
      const total = state.totalCost
      const activeCount = state.activePlayers.length
      return activeCount > 0 ? Math.round(total / activeCount) : 0
    },

    // จำนวนรอบทั้งหมดที่เป็นไปได้
    totalRounds: (state) => {
      const totalMinutes = state.gameSettings.hoursPerSession * 60
      return Math.floor(totalMinutes / state.gameSettings.roundDuration)
    },

    // ตรวจสอบว่ามี session อยู่หรือไม่
    hasActiveSession: (state) => state.currentSession.id !== null,

    // รอบปัจจุบัน
    currentRoundNumber: (state) => state.currentSession.currentRound + 1,

    // ผู้เล่นที่พักในรอบนี้
    restingPlayers: (state) => {
      if (!state.currentMatches.length) return []

      // ตรวจสอบว่าแต่ละ match มี players หรือไม่
      const playingPlayers = state.currentMatches
        .filter(match => match && match.players && Array.isArray(match.players))
        .flatMap(match => match.players.map(p => p.id))

      return state.activePlayers.filter(player => !playingPlayers.includes(player.id))
    },

    // จำนวนทีมทั้งหมดที่เป็นไปได้
    maxTeams: (state) => {
      return Math.floor(state.activePlayers.length / 4)
    },

    // ตรวจสอบว่าสามารถเล่นแบบทัวร์นาเมนต์ได้ไหม
    canPlayTournament: (state) => {
      const playerCount = state.activePlayers.length
      return playerCount >= 8 && playerCount % 4 === 0
    },

    // Winner Stays On getters
    isWinnerStaysOnMode: (state) => state.winnerStaysOnData.isActive,

    courtWinStreaks: (state) => state.winnerStaysOnData.courtWinStreaks,

    winnerStaysOnHistory: (state) => state.winnerStaysOnData.matchHistory,

    // สถิติการเล่นของแต่ละคน (จำนวนรอบที่เล่น)
    playerPlayStats: (state) => {
      if (!state.winnerStaysOnData.isActive) return []

      return state.activePlayers.map(player => ({
        ...player,
        roundsPlayed: state.winnerStaysOnData.playerRounds[player.id] || 0
      })).sort((a, b) => a.roundsPlayed - b.roundsPlayed) // เรียงจากน้อยไปมาก
    }
  },

  actions: {
    // เพิ่มผู้เล่น
    addPlayer(name, gender) {
      const newPlayer = {
        id: Date.now(),
        name: name.trim(),
        gender: gender, // 'male' หรือ 'female'
        isActive: true,
        gamesPlayed: 0,
        totalPlayTime: 0,
        createdAt: new Date(),
        isUpdating: false
      }
      this.players.push(newPlayer)
      return newPlayer
    },

    // ตั้งค่าผู้เล่นจาก Firestore
    setPlayersFromFirestore(firestorePlayers) {
      this.players = firestorePlayers.map(player => ({
        id: player.id || Date.now() + Math.random(),
        name: player.name,
        gender: player.gender,
        isActive: player.isActive ?? true,
        gamesPlayed: player.gamesPlayed || 0,
        totalPlayTime: player.totalPlayTime || 0,
        createdAt: player.createdAt?.toDate() || new Date(),
        firestoreId: player.firestoreId,
        isUpdating: false
      }))
    },

    // ลบผู้เล่น
    removePlayer(playerId) {
      const index = this.players.findIndex(p => p.id === playerId)
      if (index > -1) {
        this.players.splice(index, 1)
      }
    },

    // แก้ไขข้อมูลผู้เล่น
    updatePlayer(playerId, updates) {
      const player = this.players.find(p => p.id === playerId)
      if (player) {
        Object.assign(player, updates)
      }
    },

    // อัพเดทสถานะผู้เล่น (เข้า/ออกจากเซสชั่น)
    togglePlayerActive(playerId) {
      const player = this.players.find(p => p.id === playerId)
      if (player) {
        player.isActive = !player.isActive
      }
    },

    // อัพเดทการตั้งค่าเกม
    updateGameSettings(settings) {
      this.gameSettings = { ...this.gameSettings, ...settings }
    },

    // สร้าง key สำหรับ pair history
    createPairKey(player1Id, player2Id) {
      return [player1Id, player2Id].sort().join('-')
    },

    // เพิ่มคู่เข้าประวัติ
    addPairToHistory(player1Id, player2Id) {
      const key = this.createPairKey(player1Id, player2Id)
      const currentCount = this.currentSession.pairHistory[key] || 0
      this.currentSession.pairHistory[key] = currentCount + 1
    },

    // ตรวจสอบว่าคู่นี้เคยเล่นด้วยกันแล้วหรือไม่
    havePaired(player1Id, player2Id) {
      const key = this.createPairKey(player1Id, player2Id)
      return (this.currentSession.pairHistory[key] || 0) > 0
    },

    // คำนวณคะแนนความเหมาะสมของการจับคู่
    calculatePairScore(player1, player2, player3, player4) {
      let score = 0

      // ลดคะแนนถ้าเคยเล่นด้วยกันแล้ว
      if (this.havePaired(player1.id, player2.id)) score -= 10
      if (this.havePaired(player1.id, player3.id)) score -= 10
      if (this.havePaired(player1.id, player4.id)) score -= 10
      if (this.havePaired(player2.id, player3.id)) score -= 10
      if (this.havePaired(player2.id, player4.id)) score -= 10
      if (this.havePaired(player3.id, player4.id)) score -= 10

      // เพิ่มคะแนนสำหรับคู่ผสม
      const genderVariety = new Set([player1.gender, player2.gender, player3.gender, player4.gender]).size
      if (genderVariety === 2) score += 5 // มีทั้งชายและหญิง

      // เพิ่มคะแนนสำหรับการกระจายประสบการณ์
      const experienceSpread = Math.abs(
        (player1.gamesPlayed + player2.gamesPlayed) -
        (player3.gamesPlayed + player4.gamesPlayed)
      )
      score -= experienceSpread // ลดคะแนนถ้าความสามารถห่างกันมาก

      return score
    },

    // ระบบจับคู่อัตโนมัติแบบฉลาด
    generateMatches() {
      if (this.activePlayers.length < 4) {
        this.currentMatches = []
        this.waitingPlayers = []
        return []
      }

      // Reset การจับคู่ปัจจุบัน
      this.currentMatches = []

      const availablePlayers = [...this.activePlayers]
      const matches = []

      // คำนวณจำนวนคอร์ดที่ใช้จริง
      const maxPossibleCourts = Math.min(
        this.gameSettings.courts,
        Math.floor(availablePlayers.length / 4)
      )

      for (let court = 0; court < maxPossibleCourts; court++) {
        if (availablePlayers.length < 4) break

        const match = this.createSingleMatch(availablePlayers, court + 1)
        if (match) {
          matches.push(match)
          // ลบผู้เล่นที่ใช้แล้วออกจากรายการ
          match.players.forEach(player => {
            const index = availablePlayers.findIndex(p => p.id === player.id)
            if (index > -1) availablePlayers.splice(index, 1)
          })
        }
      }

      this.currentMatches = matches
      this.waitingPlayers = availablePlayers // ผู้เล่นที่เหลือ = ทีมพัก

      // บันทึกประวัติการจับคู่
      this.saveMatchesToHistory(matches)

      return matches
    },



    // สร้างกลุ่มผู้เล่นที่เน้นการผสมเพศและจัดการกรณีผู้เล่นไม่ครบคู่
    createMixedGenderGroups(malePlayers, femalePlayers, maxCourts) {
      const groups = []
      const maleQueue = [...malePlayers]
      const femaleQueue = [...femalePlayers]

      // คำนวณจำนวนคอร์ดที่ใช้งานได้จริง
      const totalPlayers = maleQueue.length + femaleQueue.length
      const actualCourts = Math.min(maxCourts, Math.floor(totalPlayers / 4))

      // วนลูปสร้างกลุ่มตามจำนวนคอร์ดที่ใช้งานได้จริง
      for (let court = 0; court < actualCourts; court++) {
        const group = []

        // ตรวจสอบว่ายังมีผู้เล่นเพียงพอสำหรับกลุ่มนี้หรือไม่
        const remainingTotal = maleQueue.length + femaleQueue.length
        if (remainingTotal < 4) {
          break // หยุดถ้าผู้เล่นเหลือน้อยกว่า 4 คน
        }

        // พยายามสร้างกลุ่มผสม 2 ชาย 2 หญิง (เหมาะสุด)
        if (maleQueue.length >= 2 && femaleQueue.length >= 2) {
          group.push(maleQueue.pop(), maleQueue.pop())
          group.push(femaleQueue.pop(), femaleQueue.pop())
        }
        // ถ้าชายเหลือ 1 คน หญิงเหลือ 3+ คน
        else if (maleQueue.length >= 1 && femaleQueue.length >= 3) {
          group.push(maleQueue.pop())
          group.push(femaleQueue.pop(), femaleQueue.pop(), femaleQueue.pop())
        }
        // ถ้าหญิงเหลือ 1 คน ชายเหลือ 3+ คน
        else if (femaleQueue.length >= 1 && maleQueue.length >= 3) {
          group.push(femaleQueue.pop())
          group.push(maleQueue.pop(), maleQueue.pop(), maleQueue.pop())
        }
        // ถ้าเหลือแค่ชาย 4+ คน
        else if (maleQueue.length >= 4 && femaleQueue.length === 0) {
          group.push(maleQueue.pop(), maleQueue.pop(), maleQueue.pop(), maleQueue.pop())
        }
        // ถ้าเหลือแค่หญิง 4+ คน
        else if (femaleQueue.length >= 4 && maleQueue.length === 0) {
          group.push(femaleQueue.pop(), femaleQueue.pop(), femaleQueue.pop(), femaleQueue.pop())
        }
        // กรณีพิเศษ: รวมคนที่เหลือทั้งหมดถ้าพอจำนวน
        else {
          const remaining = [...maleQueue, ...femaleQueue]
          if (remaining.length >= 4) {
            const shuffled = this.shuffleArray(remaining)
            group.push(...shuffled.slice(0, 4))

            // ลบคนที่ใช้แล้วออกจาก queue
            for (let i = 0; i < 4; i++) {
              const usedPlayer = group[i]
              if (usedPlayer.gender === 'male') {
                const index = maleQueue.findIndex(p => p.id === usedPlayer.id)
                if (index > -1) maleQueue.splice(index, 1)
              } else {
                const index = femaleQueue.findIndex(p => p.id === usedPlayer.id)
                if (index > -1) femaleQueue.splice(index, 1)
              }
            }
          }
        }

        // เพิ่มกลุ่มถ้ามีผู้เล่นครบ 4 คน
        if (group.length === 4) {
          groups.push(group) // ไม่สุ่มที่นี่ เพราะจะสุ่มใน arrangePlayersForMixedTeams()
        }
      }

      return groups
    },

    // สร้างกลุ่มผู้เล่นที่เน้นการผสมเพศและพิจารณา pair history
    createMixedGenderGroupsWithHistory(malePlayers, femalePlayers, maxCourts) {
      const groups = []
      const maleQueue = [...malePlayers]
      const femaleQueue = [...femalePlayers]

      // คำนวณจำนวนคอร์ดที่ใช้งานได้จริง
      const totalPlayers = maleQueue.length + femaleQueue.length
      const actualCourts = Math.min(maxCourts, Math.floor(totalPlayers / 4))

      // วนลูปสร้างกลุ่มตามจำนวนคอร์ดที่ใช้งานได้จริง
      for (let court = 0; court < actualCourts; court++) {
        const group = []

        // ตรวจสอบว่ายังมีผู้เล่นเพียงพอสำหรับกลุ่มนี้หรือไม่
        const remainingTotal = maleQueue.length + femaleQueue.length
        if (remainingTotal < 4) {
          break // หยุดถ้าผู้เล่นเหลือน้อยกว่า 4 คน
        }

        // พยายามหากลุ่ม 4 คนที่มี pair history น้อยที่สุด
        const bestGroup = this.findBestGroupWithHistory([...maleQueue, ...femaleQueue])

        if (bestGroup && bestGroup.length === 4) {
          group.push(...bestGroup)

          // ลบคนที่ใช้แล้วออกจาก queue
          bestGroup.forEach(usedPlayer => {
            if (usedPlayer.gender === 'male') {
              const index = maleQueue.findIndex(p => p.id === usedPlayer.id)
              if (index > -1) maleQueue.splice(index, 1)
            } else {
              const index = femaleQueue.findIndex(p => p.id === usedPlayer.id)
              if (index > -1) femaleQueue.splice(index, 1)
            }
          })
        } else {
          // ถ้าหากลุ่มที่ดีไม่ได้ ใช้วิธีเดิม
          this.fallbackGroupCreation(group, maleQueue, femaleQueue)
        }

        // เพิ่มกลุ่มถ้ามีผู้เล่นครบ 4 คน
        if (group.length === 4) {
          groups.push(group)
        }
      }

      return groups
    },

    // หากลุ่ม 4 คนที่มี pair history น้อยที่สุด โดยให้ความสำคัญกับการผสมเพศ
    findBestGroupWithHistory(availablePlayers) {
      if (availablePlayers.length < 4) return null

      const males = availablePlayers.filter(p => p.gender === 'male')
      const females = availablePlayers.filter(p => p.gender === 'female')

      // ลำดับความสำคัญ: พยายามหากลุ่ม 2 ชาย 2 หญิง ก่อน
      if (males.length >= 2 && females.length >= 2) {
        return this.findBestMixedGroup(males, females)
      }

      // ถ้าไม่สามารถสร้างกลุ่มผสมได้ ใช้วิธีเดิม
      let bestGroup = null
      let lowestHistoryScore = Infinity

      const maxTries = Math.min(50, Math.floor(availablePlayers.length / 4) * 20)

      for (let attempt = 0; attempt < maxTries; attempt++) {
        const shuffled = this.shuffleArray([...availablePlayers])
        const testGroup = shuffled.slice(0, 4)

        // คำนวณคะแนน history (น้อยกว่า = ดีกว่า)
        let historyScore = 0
        for (let i = 0; i < 3; i++) {
          for (let j = i + 1; j < 4; j++) {
            if (this.havePaired(testGroup[i].id, testGroup[j].id)) {
              historyScore += 1
            }
          }
        }

        // เพิ่มโบนัสสำหรับการผสมเพศ
        const genders = new Set(testGroup.map(p => p.gender))
        if (genders.size === 2) {
          historyScore -= 0.5 // ลดคะแนน (ดีกว่า) ถ้าผสมเพศ
        }

        if (historyScore < lowestHistoryScore) {
          lowestHistoryScore = historyScore
          bestGroup = [...testGroup]

          // ถ้าได้กลุ่มที่ไม่มี history เลย และผสมเพศ ให้หยุดทันที
          if (historyScore <= -0.5) {
            break
          }
        }
      }

      return bestGroup
    },

    // หากลุ่มผสม 2 ชาย 2 หญิง ที่มี pair history น้อยที่สุด
    findBestMixedGroup(males, females) {
      let bestGroup = null
      let lowestHistoryScore = Infinity

      // ลองทุกการจับคู่ 2 ชาย 2 หญิง ที่เป็นไปได้
      for (let i = 0; i < males.length - 1; i++) {
        for (let j = i + 1; j < males.length; j++) {
          for (let k = 0; k < females.length - 1; k++) {
            for (let l = k + 1; l < females.length; l++) {
              const testGroup = [males[i], males[j], females[k], females[l]]

              // คำนวณคะแนน history
              let historyScore = 0
              for (let m = 0; m < 3; m++) {
                for (let n = m + 1; n < 4; n++) {
                  if (this.havePaired(testGroup[m].id, testGroup[n].id)) {
                    historyScore += 1
                  }
                }
              }

              if (historyScore < lowestHistoryScore) {
                lowestHistoryScore = historyScore
                bestGroup = [...testGroup]

                // ถ้าได้กลุ่มที่ไม่มี history เลย ให้หยุดทันที
                if (historyScore === 0) {
                  return bestGroup
                }
              }
            }
          }
        }
      }

      return bestGroup
    },

    // วิธีสำรองในการสร้างกลุ่ม (ใช้เมื่อหาวิธีดีไม่ได้)
    fallbackGroupCreation(group, maleQueue, femaleQueue) {
      // พยายามสร้างกลุ่มผสม 2 ชาย 2 หญิง (เหมาะสุด)
      if (maleQueue.length >= 2 && femaleQueue.length >= 2) {
        group.push(maleQueue.pop(), maleQueue.pop())
        group.push(femaleQueue.pop(), femaleQueue.pop())
      }
      // ถ้าชายเหลือ 1 คน หญิงเหลือ 3+ คน
      else if (maleQueue.length >= 1 && femaleQueue.length >= 3) {
        group.push(maleQueue.pop())
        group.push(femaleQueue.pop(), femaleQueue.pop(), femaleQueue.pop())
      }
      // ถ้าหญิงเหลือ 1 คน ชายเหลือ 3+ คน
      else if (femaleQueue.length >= 1 && maleQueue.length >= 3) {
        group.push(femaleQueue.pop())
        group.push(maleQueue.pop(), maleQueue.pop(), maleQueue.pop())
      }
      // ถ้าเหลือแค่ชาย 4+ คน
      else if (maleQueue.length >= 4 && femaleQueue.length === 0) {
        group.push(maleQueue.pop(), maleQueue.pop(), maleQueue.pop(), maleQueue.pop())
      }
      // ถ้าเหลือแค่หญิง 4+ คน
      else if (femaleQueue.length >= 4 && maleQueue.length === 0) {
        group.push(femaleQueue.pop(), femaleQueue.pop(), femaleQueue.pop(), femaleQueue.pop())
      }
      // กรณีพิเศษ: รวมคนที่เหลือทั้งหมดถ้าพอจำนวน
      else {
        const remaining = [...maleQueue, ...femaleQueue]
        if (remaining.length >= 4) {
          const shuffled = this.shuffleArray(remaining)
          const selectedPlayers = shuffled.slice(0, 4)
          group.push(...selectedPlayers)

          // ลบคนที่ใช้ไปแล้วออกจาก queue
          selectedPlayers.forEach(usedPlayer => {
            if (usedPlayer.gender === 'male') {
              const index = maleQueue.findIndex(p => p.id === usedPlayer.id)
              if (index > -1) maleQueue.splice(index, 1)
            } else {
              const index = femaleQueue.findIndex(p => p.id === usedPlayer.id)
              if (index > -1) femaleQueue.splice(index, 1)
            }
          })
        }
      }
    },

    // จัดเรียงผู้เล่น 4 คนให้ทีม A และ B ผสมเพศให้ดีที่สุด และป้องกันการจับคู่ที่ไม่สมดุล
    arrangePlayersForMixedTeams(players) {
      if (players.length !== 4) return players

      const males = players.filter(p => p.gender === 'male')
      const females = players.filter(p => p.gender === 'female')

      // กรณี 2 ชาย 2 หญิง - ต้องรับประกันว่าแต่ละทีมผสมเพศ
      if (males.length === 2 && females.length === 2) {
        // ทีม A: ชาย 1 + หญิง 1, ทีม B: ชาย 1 + หญิง 1
        // ป้องกันการเกิด ทีม A: ชาย 2, ทีม B: หญิง 2
        return [males[0], females[0], males[1], females[1]]
      }

      // กรณี 3 ชาย 1 หญิง
      else if (males.length === 3 && females.length === 1) {
        // ทีม A: ชาย 1 + หญิง 1, ทีม B: ชาย 2
        return [males[0], females[0], males[1], males[2]]
      }

      // กรณี 1 ชาย 3 หญิง
      else if (males.length === 1 && females.length === 3) {
        // ทีม A: ชาย 1 + หญิง 1, ทีม B: หญิง 2
        return [males[0], females[0], females[1], females[2]]
      }

      // กรณี 4 ชาย - แบ่งเท่า ๆ กัน
      else if (males.length === 4 && females.length === 0) {
        // ทีม A: ชาย 2, ทีม B: ชาย 2
        return [males[0], males[1], males[2], males[3]]
      }

      // กรณี 4 หญิง - แบ่งเท่า ๆ กัน
      else if (females.length === 4 && males.length === 0) {
        // ทีม A: หญิง 2, ทีม B: หญิง 2
        return [females[0], females[1], females[2], females[3]]
      }

      // กรณีอื่น ๆ ที่ไม่คาดคิด
      else {
        // สุ่มแต่ตรวจสอบไม่ให้เกิดการจับคู่ที่ไม่สมดุล
        const shuffled = this.shuffleArray(players)

        // ตรวจสอบว่าทีม A และ B มีเพศเดียวกันหรือไม่
        const teamA = shuffled.slice(0, 2)
        const teamB = shuffled.slice(2, 4)

        const teamAGenders = new Set(teamA.map(p => p.gender))
        const teamBGenders = new Set(teamB.map(p => p.gender))

        // ถ้าทีม A และ B เป็นเพศเดียวกันแต่ต่างเพศ (เช่น A=ชาย, B=หญิง) ให้สลับ
        if (teamAGenders.size === 1 && teamBGenders.size === 1 &&
          [...teamAGenders][0] !== [...teamBGenders][0]) {
          // สลับ player 1 คนเพื่อให้ผสม
          return [shuffled[0], shuffled[2], shuffled[1], shuffled[3]]
        }

        return shuffled
      }
    },

    // ฟังก์ชันสุ่มอาเรย์ (Fisher-Yates shuffle)
    shuffleArray(array) {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    },

    // สร้างการจับคู่เดี่ยวสำหรับคอร์ดหนึ่ง
    createSingleMatch(availablePlayers, courtNumber) {
      if (availablePlayers.length < 4) return null

      const bestCombination = this.findBestCombination(availablePlayers.slice(0, Math.min(8, availablePlayers.length)))

      if (!bestCombination) return null

      // จัดเรียงผู้เล่นให้ทีม A และ B ผสมเพศให้ดีที่สุด
      const arrangedPlayers = this.arrangePlayersForMixedTeams(bestCombination.players)

      return {
        id: `match-${Date.now()}-${courtNumber}-${Math.random().toString(36).substr(2, 5)}`,
        courtNumber,
        players: arrangedPlayers,
        type: this.determineMatchType(arrangedPlayers),
        score: bestCombination.score,
        roundNumber: this.currentSession.currentRound + 1,
        status: 'playing', // 'playing', 'finished'
        result: null, // จะเก็บผลการแข่งขัน
        winner: null
      }
    },

    // หาการจับคู่ที่ดีที่สุดสำหรับคอร์ดหนึ่ง (ปรับปรุงให้มีความสุ่มมากขึ้น)
    findBestCombination(availablePlayers) {
      if (availablePlayers.length < 4) return null

      let combinations = []

      // ลองทุกการจับคู่ที่เป็นไปได้
      for (let i = 0; i < availablePlayers.length - 3; i++) {
        for (let j = i + 1; j < availablePlayers.length - 2; j++) {
          for (let k = j + 1; k < availablePlayers.length - 1; k++) {
            for (let l = k + 1; l < availablePlayers.length; l++) {
              const players = [
                availablePlayers[i],
                availablePlayers[j],
                availablePlayers[k],
                availablePlayers[l]
              ]

              const score = this.calculatePairScore(...players)

              combinations.push({ players, score })
            }
          }
        }
      }

      if (combinations.length === 0) return null

      // เรียงตามคะแนน
      combinations.sort((a, b) => b.score - a.score)

      // เลือกจากกลุ่มที่มีคะแนนดีที่สุด (top 30%) แบบสุ่ม
      const topCombinations = combinations.slice(0, Math.max(1, Math.ceil(combinations.length * 0.3)))
      const randomIndex = Math.floor(Math.random() * topCombinations.length)

      return topCombinations[randomIndex]
    },

    // กำหนดประเภทของการแข่งขัน
    determineMatchType(players) {
      const maleCount = players.filter(p => p.gender === 'male').length
      const femaleCount = players.filter(p => p.gender === 'female').length

      if (maleCount === 4) return 'male'
      if (femaleCount === 4) return 'female'
      if (maleCount === 2 && femaleCount === 2) return 'mixed'
      return 'mixed' // default
    },

    // เริ่มเซสชั่นใหม่
    startSession() {
      this.currentSession = {
        id: Date.now(),
        startTime: new Date(),
        endTime: null,
        participants: [...this.activePlayers],
        rounds: [],
        currentRound: 0,
        pairHistory: {},
        totalCost: this.totalCost
      }
    },

    // เริ่มรอบใหม่
    startNewRound() {
      if (!this.hasActiveSession) {
        console.warn('ไม่มี session ที่เปิดอยู่')
        return false
      }

      if (this.currentSession.currentRound >= this.totalRounds) {
        console.warn('ครบจำนวนรอบแล้ว')
        return false
      }

      // บันทึกข้อมูลรอบปัจจุบัน (ถ้ามี)
      if (this.currentMatches.length > 0) {
        this.currentSession.rounds.push({
          roundNumber: this.currentSession.currentRound + 1,
          matches: [...this.currentMatches],
          startTime: new Date(),
          endTime: new Date(Date.now() + (this.gameSettings.roundDuration * 60000))
        })
      }

      // ไปรอบถัดไป
      this.currentSession.currentRound++

      // ถ้าเป็นโหมด Winner Stays On ให้ reset ข้อมูลและเริ่มใหม่
      if (this.isWinnerStaysOnMode) {
        // Reset win streaks และ player rounds
        this.winnerStaysOnData.courtWinStreaks = {}
        this.winnerStaysOnData.matchHistory = []
        this.resetPlayerRounds()

        // สร้างการจับคู่ใหม่แบบ Winner Stays On
        this.generateWinnerStaysOnMatches()
      } else {
        // สร้างการจับคู่ใหม่แบบปกติ
        this.generateMatches()
      }

      return true
    },

    // จบเซสชั่น
    endSession() {
      if (!this.hasActiveSession) return

      // บันทึกรอบสุดท้าย
      if (this.currentMatches.length > 0) {
        this.currentSession.rounds.push({
          roundNumber: this.currentSession.currentRound + 1,
          matches: [...this.currentMatches],
          startTime: new Date(),
          endTime: new Date()
        })
      }

      this.currentSession.endTime = new Date()

      // บันทึกเข้าประวัติ
      this.gameHistory.push({
        ...this.currentSession,
        settings: { ...this.gameSettings }
      })

      // อัพเดทสถิติผู้เล่น
      this.currentSession.participants.forEach(player => {
        const p = this.players.find(pl => pl.id === player.id)
        if (p) {
          p.gamesPlayed += this.currentSession.rounds.length
          p.totalPlayTime += this.gameSettings.hoursPerSession
        }
      })

      // รีเซ็ต
      this.currentSession = {
        id: null,
        startTime: null,
        endTime: null,
        participants: [],
        rounds: [],
        currentRound: 0,
        pairHistory: {},
        totalCost: 0
      }
      this.currentMatches = []
    },

    // ดูประวัติการจับคู่ในเซสชั่นปัจจุบัน
    getPairHistory() {
      const history = []
      for (const [pairKey, count] of Object.entries(this.currentSession.pairHistory)) {
        const [player1Id, player2Id] = pairKey.split('-').map(Number)
        const player1 = this.players.find(p => p.id === player1Id)
        const player2 = this.players.find(p => p.id === player2Id)

        if (player1 && player2) {
          history.push({
            player1: player1.name,
            player2: player2.name,
            count
          })
        }
      }
      return history.sort((a, b) => b.count - a.count)
    },

    // คำนวณค่าใช้จ่ายแยกตามเวลาเล่น
    calculateCustomCost(playerId, hoursPlayed) {
      const baseHourlyRate = this.totalCost / (this.gameSettings.hoursPerSession * this.activePlayers.length)
      return Math.round(baseHourlyRate * hoursPlayed)
    },

    // จับคู่เร็ว - สำหรับ mobile/iPad ใช้งานง่าย
    quickMatch() {
      if (this.activePlayers.length < 4) {
        return { success: false, message: 'ต้องมีผู้เล่นอย่างน้อย 4 คน' }
      }

      // ถ้ายังไม่มีเซสชั่น ให้เริ่มเซสชั่นใหม่
      if (!this.hasActiveSession) {
        this.startSession()
      }

      // จับคู่
      const matches = this.generateMatches()

      if (matches.length > 0) {
        return {
          success: true,
          matches,
          message: `จับคู่สำเร็จ ${matches.length} คอร์ด!`
        }
      } else {
        return {
          success: false,
          message: 'ไม่สามารถจับคู่ได้ ตรวจสอบจำนวนผู้เล่น'
        }
      }
    },

    // บันทึกผลการแข่งขัน
    recordMatchResult(matchId, result) {
      const match = this.currentMatches.find(m => m.id === matchId)
      if (match) {
        match.result = result
        match.status = 'finished'
        match.winner = result.winner // 'teamA' หรือ 'teamB'
      }
    },

    // เริ่มทัวร์นาเมนต์
    startTournament() {
      if (!this.canPlayTournament) {
        return { success: false, message: 'ต้องมีผู้เล่น 8, 12, 16 คน เป็นต้น (หารด้วย 4 ลงตัว)' }
      }

      this.gameSettings.gameMode = 'tournament'
      this.startSession()

      // สร้าง brackets
      this.createTournamentBrackets()

      return { success: true, message: 'เริ่มทัวร์นาเมนต์แล้ว!' }
    },

    // สร้าง tournament brackets
    createTournamentBrackets() {
      const teams = []
      const players = [...this.activePlayers]

      // สร้างทีม (4 คน = 2 ทีม)
      for (let i = 0; i < players.length; i += 4) {
        if (i + 3 < players.length) {
          teams.push({
            id: `team-${teams.length + 1}`,
            players: players.slice(i, i + 4),
            name: `ทีม ${teams.length + 1}`,
            status: 'active'
          })
        }
      }

      this.currentSession.tournament.brackets = teams
      this.currentSession.mode = 'tournament'
    },

    // จับคู่แบบทัวร์นาเมนต์
    generateTournamentMatches() {
      const activeTeams = this.currentSession.tournament.brackets.filter(t => t.status === 'active')

      if (activeTeams.length < 2) {
        return { success: false, message: 'ไม่มีทีมเพียงพอสำหรับการแข่งขัน' }
      }

      const matches = []
      const maxMatches = Math.min(this.gameSettings.courts, Math.floor(activeTeams.length / 2))

      for (let i = 0; i < maxMatches * 2; i += 2) {
        if (i + 1 < activeTeams.length) {
          const match = {
            id: `tournament-match-${Date.now()}-${i}`,
            courtNumber: Math.floor(i / 2) + 1,
            teamA: activeTeams[i],
            teamB: activeTeams[i + 1],
            players: [...activeTeams[i].players, ...activeTeams[i + 1].players],
            type: 'tournament',
            status: 'playing',
            result: null,
            winner: null
          }
          matches.push(match)
        }
      }

      this.currentMatches = matches

      // คำนวณทีมที่รอ
      const playingTeams = matches.flatMap(m => [m.teamA.id, m.teamB.id])
      const waitingTeams = activeTeams.filter(team => !playingTeams.includes(team.id))
      this.waitingPlayers = waitingTeams.flatMap(team => team.players)

      return { success: true, matches }
    },

    // บันทึกผลทัวร์นาเมนต์
    recordTournamentResult(matchId, winnerTeamId) {
      const match = this.currentMatches.find(m => m.id === matchId)
      if (!match) return

      match.status = 'finished'
      match.winner = winnerTeamId

      // อัพเดทสถานะทีม
      const winnerTeam = match.teamA.id === winnerTeamId ? match.teamA : match.teamB
      const loserTeam = match.teamA.id === winnerTeamId ? match.teamB : match.teamA

      loserTeam.status = 'eliminated'
      this.currentSession.tournament.winners.push(winnerTeam)

      // ตรวจสอบว่าจบทัวร์นาเมนต์แล้วหรือยัง
      const remainingTeams = this.currentSession.tournament.brackets.filter(t => t.status === 'active')
      if (remainingTeams.length === 1) {
        // มีผู้ชนะแล้ว
        this.currentSession.tournament.champion = remainingTeams[0]
      }
    },

    // สลับระหว่างโหมดปกติและทัวร์นาเมนต์
    switchGameMode(mode) {
      this.gameSettings.gameMode = mode
      if (this.hasActiveSession) {
        this.currentSession.mode = mode
      }
    },

    // รีเซ็ตทัวร์นาเมนต์
    resetTournament() {
      this.currentSession.tournament = {
        brackets: [],
        winners: [],
        currentStage: 'group',
        champion: null
      }
      this.gameSettings.gameMode = 'normal'
    },

    // บันทึกการจับคู่ลงประวัติ
    saveMatchesToHistory(matches) {
      if (!this.hasActiveSession) return

      matches.forEach(match => {
        // บันทึกประวัติคู่
        for (let i = 0; i < match.players.length - 1; i++) {
          for (let j = i + 1; j < match.players.length; j++) {
            this.addPairToHistory(match.players[i].id, match.players[j].id)
          }
        }
      })
    },

    // ดูสถิติการพัก
    getRestingStats() {
      const totalRounds = this.currentSession.rounds.length + 1
      const stats = this.activePlayers.map(player => {
        let roundsPlayed = 0
        let roundsRested = 0

        this.currentSession.rounds.forEach(round => {
          const isPlaying = round.matches.some(match =>
            match.players.some(p => p.id === player.id)
          )
          if (isPlaying) {
            roundsPlayed++
          } else {
            roundsRested++
          }
        })

        // รวมรอบปัจจุบัน
        const isCurrentlyPlaying = this.currentMatches.some(match =>
          match.players.some(p => p.id === player.id)
        )

        if (isCurrentlyPlaying) {
          roundsPlayed++
        } else {
          roundsRested++
        }

        return {
          player,
          roundsPlayed,
          roundsRested,
          playPercentage: totalRounds > 0 ? Math.round((roundsPlayed / totalRounds) * 100) : 0
        }
      })

      return stats.sort((a, b) => b.roundsPlayed - a.roundsPlayed)
    },

    // ฟังก์ชันจับคู่อัจฉริยะ (ใช้อัลกอริทึม + สุ่ม)
    smartMatch() {
      return this.generateMatches()
    },

    // ========== WINNER STAYS ON MODE ==========

    // เริ่มโหมด Winner Stays On
    startWinnerStaysOnMode() {
      if (this.activePlayers.length < 4) {
        return { success: false, message: 'ต้องการผู้เล่นอย่างน้อย 4 คน' }
      }

      // เปลี่ยนโหมดเกม
      this.gameSettings.gameMode = 'winnerStaysOn'
      this.winnerStaysOnData.isActive = true
      this.winnerStaysOnData.courtWinStreaks = {}
      this.winnerStaysOnData.matchHistory = []
      this.resetPlayerRounds() // รีเซ็ตการนับรอบเมื่อเริ่มโหมดใหม่

      // เริ่ม session หากยังไม่มี
      if (!this.hasActiveSession) {
        this.startSession()
        this.currentSession.mode = 'winnerStaysOn'
      }

      // สร้างการจับคู่เริ่มต้น
      return this.generateWinnerStaysOnMatches()
    },

    // สร้างการจับคู่แบบ Winner Stays On
    generateWinnerStaysOnMatches() {
      if (!this.winnerStaysOnData.isActive || this.activePlayers.length < 4) {
        return { success: false, message: 'ไม่สามารถสร้างการจับคู่ได้' }
      }

      // สร้างการจับคู่เริ่มต้นสำหรับแต่ละคอร์ด
      const matches = []

      // ใช้อัลกอริทึมการจับคู่ผสมเพศที่มีประสิทธิภาพ
      const malePlayers = this.shuffleArray(this.activePlayers.filter(p => p.gender === 'male'))
      const femalePlayers = this.shuffleArray(this.activePlayers.filter(p => p.gender === 'female'))

      const maxCourts = Math.min(this.gameSettings.courts, Math.floor(this.activePlayers.length / 4))

      // สร้างกลุ่มที่ผสมเพศให้ได้มากที่สุด
      const mixedGroups = this.createMixedGenderGroupsWithHistory(malePlayers, femalePlayers, maxCourts)

      for (let court = 0; court < mixedGroups.length; court++) {
        const players = mixedGroups[court]

        if (players.length === 4) {
          // จัดเรียงผู้เล่นให้ทีม A และ B ผสมเพศให้ดีที่สุด
          const arrangedPlayers = this.arrangePlayersForMixedTeams(players)

          const match = {
            id: `winner-stays-${Date.now()}-${court + 1}-${Math.random().toString(36).substr(2, 5)}`,
            courtNumber: court + 1,
            players: arrangedPlayers,
            type: this.determineMatchType(arrangedPlayers),
            status: 'playing',
            result: null,
            winner: null,
            gameNumber: 1,
            isWinnerStaysOn: true
          }

          matches.push(match)

          // เริ่มต้น win streak สำหรับคอร์ดนี้
          const teamA = arrangedPlayers.slice(0, 2)
          const teamB = arrangedPlayers.slice(2, 4)

          // Validation: ตรวจสอบทีมเริ่มต้น
          if (teamA.length !== 2 || teamB.length !== 2) {
            console.error(`Court ${court + 1} - Invalid initial team sizes!`, {
              teamA: teamA.length,
              teamB: teamB.length,
              totalPlayers: arrangedPlayers.length
            })
            continue // ข้ามคอร์ดนี้
          }



          this.winnerStaysOnData.courtWinStreaks[court + 1] = {
            teamIndex: null, // ยังไม่มีทีมชนะ
            winCount: 0,
            teamAPlayers: teamA,
            teamBPlayers: teamB
          }

          // อัปเดตการนับรอบสำหรับผู้เล่นที่เข้าแข่งขันตั้งแต่แรก
          this.updatePlayerRounds([...teamA, ...teamB].map(p => p.id))
        }
      }

      // คำนวณผู้เล่นที่พัก
      const playingPlayers = matches.flatMap(match => match.players.map(p => p.id))
      this.waitingPlayers = this.activePlayers.filter(player => !playingPlayers.includes(player.id))

      this.currentMatches = matches

      return { success: true, matches }
    },



    // บันทึกผลการแข่งขัน
    recordWinnerStaysOnResult(matchId, winnerTeam) {
      const match = this.currentMatches.find(m => m.id === matchId)
      if (!match || !match.isWinnerStaysOn) {
        return { success: false, message: 'ไม่พบการแข่งขัน' }
      }

      const court = match.courtNumber
      const courtData = this.winnerStaysOnData.courtWinStreaks[court]

      if (!courtData) {
        return { success: false, message: 'ไม่พบข้อมูลคอร์ด' }
      }

      // บันทึกผลการแข่งขัน
      match.result = winnerTeam
      match.winner = winnerTeam
      match.status = 'completed'

      // อัพเดท win streak
      if (courtData.teamIndex === winnerTeam) {
        // ทีมเดิมชนะต่อ
        courtData.winCount++
      } else {
        // ทีมใหม่ชนะ
        courtData.teamIndex = winnerTeam
        courtData.winCount = 1
      }

      // บันทึกประวัติ
      this.winnerStaysOnData.matchHistory.push({
        matchId,
        court,
        gameNumber: (this.winnerStaysOnData.matchHistory.filter(h => h.court === court).length + 1),
        teamAPlayers: [...courtData.teamAPlayers],
        teamBPlayers: [...courtData.teamBPlayers],
        winner: winnerTeam,
        timestamp: new Date()
      })

      // ตรวจสอบว่าต้องเปลี่ยนทีมหรือไม่
      return this.handleTeamRotation(court)
    },

    // จัดการการหมุนเวียนทีม
    handleTeamRotation(court) {
      const courtData = this.winnerStaysOnData.courtWinStreaks[court]
      const winnerTeam = courtData.teamIndex
      const winCount = courtData.winCount

      let needsNewTeams = false
      let message = ''

      // ทีมชนะตามจำนวนที่กำหนดในการตั้งค่า หรือไม่มีผู้เล่นรอ
      if (winCount >= this.gameSettings.winnerStaysOnWins) {
        needsNewTeams = true
        message = `ทีม ${winnerTeam === 0 ? 'A' : 'B'} ชนะ ${winCount} เกมส์ติดต่อกัน ต้องออกมาพัก`
      } else if (this.waitingPlayers.length < 2) {
        needsNewTeams = false
        message = 'ไม่มีผู้เล่นพอสำหรับทีมใหม่ เล่นต่อระหว่างทีมเดิม'
      } else {
        // ทีมแพ้ออก ทีมใหม่เข้า
        needsNewTeams = false
        message = this.rotateLosingTeam(court)
      }

      if (needsNewTeams) {
        return this.rotateBothTeams(court)
      }

      return { success: true, message, needsNewMatch: !needsNewTeams }
    },

    // เปลี่ยนทีมที่แพ้
    rotateLosingTeam(court) {
      const courtData = this.winnerStaysOnData.courtWinStreaks[court]
      const winnerTeam = courtData.teamIndex
      const losingTeam = winnerTeam === 0 ? 1 : 0

      // Validation: ตรวจสอบข้อมูลทีม
      if (!courtData.teamAPlayers || !courtData.teamBPlayers) {
        console.error('Team data is missing!')
        return 'ข้อมูลทีมผิดพลาด'
      }

      if (courtData.teamAPlayers.length !== 2 || courtData.teamBPlayers.length !== 2) {
        console.error('Team sizes are incorrect!', {
          teamA: courtData.teamAPlayers.length,
          teamB: courtData.teamBPlayers.length
        })
        return 'ขนาดทีมไม่ถูกต้อง'
      }

      // ย้ายทีมที่แพ้ไปพัก
      const losingPlayers = losingTeam === 0 ? courtData.teamAPlayers : courtData.teamBPlayers

      // Validation: ตรวจสอบทีมที่แพ้
      if (!losingPlayers || losingPlayers.length !== 2) {
        return 'ข้อมูลทีมที่แพ้ผิดพลาด'
      }

      this.waitingPlayers.push(...losingPlayers)

      // สร้างทีมใหม่จากผู้เล่นที่รอ (ยกเว้นคนที่เพิ่งออกจากคอร์ดนี้)
      const excludedPlayerIds = losingPlayers.map(p => p.id)
      const newTeam = this.createNewMixedTeam(excludedPlayerIds)

      // Validation: ตรวจสอบทีมใหม่
      if (newTeam.length !== 2) {
        return `ไม่สามารถสร้างทีมใหม่ได้ (มีผู้เล่นรอ ${this.waitingPlayers.length} คน)`
      }

      // แทนที่ทีมที่แพ้
      if (losingTeam === 0) {
        courtData.teamAPlayers = [...newTeam]
      } else {
        courtData.teamBPlayers = [...newTeam]
      }

      // Validation: ตรวจสอบหลังการแทนที่
      if (courtData.teamAPlayers.length !== 2 || courtData.teamBPlayers.length !== 2) {
        return 'การแทนที่ทีมผิดพลาด'
      }

      // สร้างการแข่งขันใหม่
      const newMatch = this.createNewMatchForCourt(court)

      // Validation: ตรวจสอบ match ใหม่
      if (!newMatch || newMatch.players.length !== 4) {
        return 'สร้างการแข่งขันใหม่ไม่สำเร็จ'
      }

      // ไม่รีเซ็ต win count เพราะทีมชนะยังคงเป็นทีมเดิม
      // winCount จะถูกรีเซ็ตเฉพาะเมื่อมีการเปลี่ยนทีมชนะเท่านั้น

      return `ทีม ${losingTeam === 0 ? 'A' : 'B'} ออกมาพัก ทีมใหม่เข้าไป`
    },

    // เปลี่ยนทั้งสองทีม
    rotateBothTeams(court) {
      const courtData = this.winnerStaysOnData.courtWinStreaks[court]

      // ย้ายทุกคนไปพัก
      const allLeavingPlayers = [...courtData.teamAPlayers, ...courtData.teamBPlayers]
      this.waitingPlayers.push(...allLeavingPlayers)

      // สร้างทีมใหม่ 2 ทีม (ยกเว้นคนที่เพิ่งออกจากคอร์ดนี้)
      const excludedPlayerIds = allLeavingPlayers.map(p => p.id)
      const newTeamA = this.createNewMixedTeam(excludedPlayerIds)
      const newTeamB = this.createNewMixedTeam(excludedPlayerIds)

      if (newTeamA.length === 2 && newTeamB.length === 2) {
        courtData.teamAPlayers = newTeamA
        courtData.teamBPlayers = newTeamB
        courtData.teamIndex = null
        courtData.winCount = 0

        // สร้างการแข่งขันใหม่
        this.createNewMatchForCourt(court)

        return {
          success: true,
          message: 'ทั้งสองทีมออกมาพัก ทีมใหม่เข้าไป',
          needsNewMatch: true
        }
      }

      return {
        success: false,
        message: 'ไม่มีผู้เล่นพอสำหรับทีมใหม่ 2 ทีม'
      }
    },

    // อัปเดตการนับรอบการเล่นของผู้เล่น
    updatePlayerRounds(playerIds) {
      if (!this.winnerStaysOnData.isActive) return

      playerIds.forEach(playerId => {
        if (!this.winnerStaysOnData.playerRounds[playerId]) {
          this.winnerStaysOnData.playerRounds[playerId] = 0
        }
        this.winnerStaysOnData.playerRounds[playerId]++
      })
    },

    // จัดลำดับผู้เล่นตามจำนวนรอบที่เล่น (น้อยไปมาก = ความสำคัญมากไปน้อย)
    sortPlayersByPlayCount(players) {
      if (!this.winnerStaysOnData.isActive) return players

      return [...players].sort((a, b) => {
        const aRounds = this.winnerStaysOnData.playerRounds[a.id] || 0
        const bRounds = this.winnerStaysOnData.playerRounds[b.id] || 0
        return aRounds - bRounds // น้อยกว่าขึ้นก่อน (ความสำคัญสูงกว่า)
      })
    },

    // รีเซ็ตการนับรอบการเล่น
    resetPlayerRounds() {
      this.winnerStaysOnData.playerRounds = {}
    },

    // สร้างทีมผสมใหม่จากผู้เล่นที่รอ (จัดลำดับความสำคัญ)
    createNewMixedTeam(excludedPlayerIds = []) {
      // กรองผู้เล่นที่รอ โดยยกเว้นคนที่เพิ่งออกจากคอร์ด
      const availableWaitingPlayers = this.waitingPlayers.filter(p => !excludedPlayerIds.includes(p.id))

      // Validation: ตรวจสอบผู้เล่นที่รอ
      if (availableWaitingPlayers.length < 2) {
        return []
      }

      // จัดลำดับผู้เล่นตามจำนวนรอบที่เล่น (คนที่เล่นน้อยขึ้นก่อน)
      const sortedWaitingPlayers = this.sortPlayersByPlayCount(availableWaitingPlayers)

      const waitingMales = this.sortPlayersByPlayCount(sortedWaitingPlayers.filter(p => p.gender === 'male'))
      const waitingFemales = this.sortPlayersByPlayCount(sortedWaitingPlayers.filter(p => p.gender === 'female'))

      let newTeam = []

      // พยายามให้ได้ 1 ชาย 1 หญิง โดยเลือกคนที่เล่นน้อยที่สุดก่อน
      if (waitingMales.length >= 1 && waitingFemales.length >= 1) {
        // เลือกชายที่เล่นน้อยที่สุด (อันดับแรกใน sorted array)
        const selectedMale = waitingMales[0]
        // เลือกหญิงที่เล่นน้อยที่สุด (อันดับแรกใน sorted array)
        const selectedFemale = waitingFemales[0]

        newTeam = [selectedMale, selectedFemale]

        // เอาออกจากรายการรอ
        const maleIndex = this.waitingPlayers.findIndex(p => p.id === selectedMale.id)
        const femaleIndex = this.waitingPlayers.findIndex(p => p.id === selectedFemale.id)

        if (maleIndex > -1) {
          this.waitingPlayers.splice(maleIndex, 1)
        }

        // ต้องหา index ใหม่หลังจากลบ male แล้ว
        const newFemaleIndex = this.waitingPlayers.findIndex(p => p.id === selectedFemale.id)
        if (newFemaleIndex > -1) {
          this.waitingPlayers.splice(newFemaleIndex, 1)
        }
      } else if (availableWaitingPlayers.length >= 2) {
        // ถ้าไม่สามารถผสมได้ ก็เลือก 2 คนที่เล่นน้อยที่สุด
        newTeam = sortedWaitingPlayers.slice(0, 2)

        // เอาออกจากรายการรอ
        newTeam.forEach((player, index) => {
          const playerIndex = this.waitingPlayers.findIndex(p => p.id === player.id)
          if (playerIndex > -1) {
            this.waitingPlayers.splice(playerIndex, 1)
          }
        })
      }

      // Validation: ตรวจสอบทีมที่สร้างขึ้น
      if (newTeam.length !== 2) {
        return []
      }

      // อัปเดตการนับรอบสำหรับผู้เล่นที่ได้เลือก
      this.updatePlayerRounds(newTeam.map(p => p.id))

      return newTeam
    },

    // สร้างการแข่งขันใหม่สำหรับคอร์ด
    createNewMatchForCourt(court) {
      const courtData = this.winnerStaysOnData.courtWinStreaks[court]

      // Validation: ตรวจสอบข้อมูลทีม
      if (!courtData.teamAPlayers || !courtData.teamBPlayers) {
        console.error('Team data missing in createNewMatchForCourt!')
        return null
      }

      if (courtData.teamAPlayers.length !== 2 || courtData.teamBPlayers.length !== 2) {
        console.error('Invalid team sizes in createNewMatchForCourt!', {
          teamA: courtData.teamAPlayers.length,
          teamB: courtData.teamBPlayers.length
        })
        return null
      }

      const players = [...courtData.teamAPlayers, ...courtData.teamBPlayers]

      // Validation: ตรวจสอบผู้เล่นรวม
      if (players.length !== 4) {
        console.error('Invalid total players count!', players.length)
        return null
      }

      const newMatch = {
        id: `winner-stays-${Date.now()}-${court}-${Math.random().toString(36).substr(2, 5)}`,
        courtNumber: court,
        players: players,
        type: this.determineMatchType(players),
        status: 'playing',
        result: null,
        winner: null,
        gameNumber: this.winnerStaysOnData.matchHistory.filter(h => h.court === court).length + 1,
        isWinnerStaysOn: true
      }

      // แทนที่การแข่งขันเดิมในคอร์ดนี้ (force reactivity update)
      const matchIndex = this.currentMatches.findIndex(m => m.courtNumber === court)

      if (matchIndex > -1) {
        // ใช้ splice เพื่อให้ Vue สังเกตการเปลี่ยนแปลง
        this.currentMatches.splice(matchIndex, 1, newMatch)
      } else {
        this.currentMatches.push(newMatch)
      }

      return newMatch
    },

    // หยุดโหมด Winner Stays On
    stopWinnerStaysOnMode() {
      this.winnerStaysOnData.isActive = false
      this.gameSettings.gameMode = 'normal'
      this.currentMatches = []
      this.waitingPlayers = []
      this.resetPlayerRounds() // รีเซ็ตการนับรอบ

      return { success: true, message: 'หยุดโหมด Winner Stays On แล้ว' }
    },

    // ========== FIRESTORE GAME SETTINGS ==========

    // โหลดการตั้งค่าจาก Firestore
    async loadGameSettingsFromFirestore(userId) {
      if (!userId) return

      try {
        const settingsRef = doc(db, 'gameSettings', userId)
        const settingsDoc = await getDoc(settingsRef)

        if (settingsDoc.exists()) {
          const firestoreSettings = settingsDoc.data()

          // อัพเดทการตั้งค่า โดยรักษาค่า default ไว้ถ้าไม่มี
          this.gameSettings = {
            ...this.gameSettings,
            ...firestoreSettings
          }

          console.log('GameSettings loaded from Firestore:', this.gameSettings)
          return { success: true, settings: this.gameSettings }
        } else {
          // ถ้าไม่มีการตั้งค่าใน Firestore ให้บันทึกค่า default ไป
          await this.saveGameSettingsToFirestore(userId)
          console.log('No settings found in Firestore, saved default settings')
          return { success: true, settings: this.gameSettings }
        }
      } catch (error) {
        console.error('Error loading game settings from Firestore:', error)
        return { success: false, error: error.message }
      }
    },

    // บันทึกการตั้งค่าไป Firestore
    async saveGameSettingsToFirestore(userId) {
      if (!userId) return

      try {
        const settingsRef = doc(db, 'gameSettings', userId)
        const settingsData = {
          ...this.gameSettings,
          updatedAt: new Date(),
          version: '1.0'
        }

        await setDoc(settingsRef, settingsData)
        console.log('GameSettings saved to Firestore:', settingsData)
        return { success: true }
      } catch (error) {
        console.error('Error saving game settings to Firestore:', error)
        return { success: false, error: error.message }
      }
    },

    // อัพเดทการตั้งค่าและบันทึกไป Firestore
    async updateGameSettingsWithFirestore(settings, userId) {
      // อัพเดทใน local store ก่อน
      this.updateGameSettings(settings)

      // แล้วบันทึกไป Firestore
      if (userId) {
        return await this.saveGameSettingsToFirestore(userId)
      }

      return { success: true }
    },


  }
})

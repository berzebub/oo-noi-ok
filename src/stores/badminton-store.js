import { defineStore } from 'pinia'

export const useBadmintonStore = defineStore('badminton', {
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
      gameMode: 'normal' // 'normal', 'tournament'
    },

    // ข้อมูล Session ปัจจุบัน
    currentSession: {
      id: null,
      startTime: null,
      endTime: null,
      participants: [],
      rounds: [],           // เก็บรอบการเล่นทั้งหมด
      currentRound: 0,      // รอบปัจจุบัน
      pairHistory: new Map(), // เก็บประวัติคู่ที่เล่นด้วยกันแล้ว
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

    waitingPlayers: [] // ผู้เล่นที่รอคิว
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

      const playingPlayers = state.currentMatches.flatMap(match => match.players.map(p => p.id))
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
      const currentCount = this.currentSession.pairHistory.get(key) || 0
      this.currentSession.pairHistory.set(key, currentCount + 1)
    },

    // ตรวจสอบว่าคู่นี้เคยเล่นด้วยกันแล้วหรือไม่
    havePaired(player1Id, player2Id) {
      const key = this.createPairKey(player1Id, player2Id)
      return (this.currentSession.pairHistory.get(key) || 0) > 0
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

    // สร้างการจับคู่แบบสุ่มใหม่ (เน้นการผสมเพศ) พร้อมป้องกันการซ้ำคู่
    generateRandomMatches() {
      if (this.activePlayers.length < 4) {
        this.currentMatches = []
        this.waitingPlayers = []
        return []
      }

      // ถ้ายังไม่มี session ให้เริ่มใหม่
      if (!this.hasActiveSession) {
        this.startSession()
      }

      // Reset การจับคู่ปัจจุบัน
      this.currentMatches = []

      // แยกผู้เล่นตามเพศ
      const malePlayers = this.shuffleArray(this.activePlayers.filter(p => p.gender === 'male'))
      const femalePlayers = this.shuffleArray(this.activePlayers.filter(p => p.gender === 'female'))

      const matches = []
      const maxPossibleCourts = Math.min(
        this.gameSettings.courts,
        Math.floor(this.activePlayers.length / 4)
      )

      // สร้างกลุ่มที่ผสมเพศให้ได้มากที่สุด พร้อมพิจารณา pair history
      const mixedGroups = this.createMixedGenderGroupsWithHistory(malePlayers, femalePlayers, maxPossibleCourts)

      for (let court = 0; court < mixedGroups.length; court++) {
        const players = mixedGroups[court]

                 if (players.length === 4) {
           // จัดเรียงผู้เล่นให้ทีม A และ B ผสมเพศให้ดีที่สุด
           const arrangedPlayers = this.arrangePlayersForMixedTeams(players)

           const match = {
             id: `match-${Date.now()}-${court + 1}-${Math.random().toString(36).substr(2, 5)}`,
             courtNumber: court + 1,
             players: arrangedPlayers,
             type: this.determineMatchType(arrangedPlayers),
             score: 0, // สุ่มแบบไม่มีคะแนน
             roundNumber: this.currentSession.currentRound + 1,
             status: 'playing',
             result: null,
             winner: null
           }

           matches.push(match)
         }
      }

      // คำนวณผู้เล่นที่พัก
      const playingPlayers = matches.flatMap(match => match.players.map(p => p.id))
      this.waitingPlayers = this.activePlayers.filter(player => !playingPlayers.includes(player.id))

      this.currentMatches = matches

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

    // หากลุ่ม 4 คนที่มี pair history น้อยที่สุด
    findBestGroupWithHistory(availablePlayers) {
      if (availablePlayers.length < 4) return null

      let bestGroup = null
      let lowestHistoryScore = Infinity

      // ลองทุกการจับคู่ที่เป็นไปได้ (สุ่มตัวอย่าง 50 กลุ่มเพื่อประสิทธิภาพ)
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
          group.push(...shuffled.slice(0, 4))
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
        pairHistory: new Map(),
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

      // สร้างการจับคู่ใหม่
      this.generateMatches()

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
        pairHistory: new Map(),
        totalCost: 0
      }
      this.currentMatches = []
    },

    // ดูประวัติการจับคู่ในเซสชั่นปัจจุบัน
    getPairHistory() {
      const history = []
      for (const [pairKey, count] of this.currentSession.pairHistory.entries()) {
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

    // ฟังก์ชันสุ่มแบบใหม่ทั้งหมด
    randomMatch() {
      return this.generateRandomMatches()
    }
  }
})

<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h4">คำนวณค่าใช้จ่าย</div>
        <div class="text-subtitle2 text-grey-7">แบ่งค่าใช้จ่ายและจัดการการเงิน</div>
      </div>
    </div>

    <!-- Cost Summary -->
    <q-card class="q-mb-lg modern-card">
      <q-card-section class="bg-gradient-primary text-white">
        <div class="text-h5 text-center">
          <q-icon name="calculate" size="md" class="q-mr-sm" />
          สรุปค่าใช้จ่าย
        </div>
      </q-card-section>

      <q-card-section>
        <div class="row q-gutter-lg">
          <div class="col-12 col-md-3">
            <div class="cost-summary-item">
              <q-icon name="sports_tennis" size="2rem" color="primary" />
              <div class="cost-title">ค่าคอร์ด</div>
              <div class="cost-amount text-primary">{{ courtCost }} บาท</div>
              <div class="cost-detail">{{ gameSettings.courts }} คอร์ด × {{ gameSettings.hoursPerSession }} ชม.</div>
            </div>
          </div>

          <div class="col-12 col-md-3">
            <div class="cost-summary-item">
              <q-icon name="sports" size="2rem" color="green" />
              <div class="cost-title">ค่าลูกแบด</div>
              <div class="cost-amount text-green">{{ shuttleCost }} บาท</div>
              <div class="cost-detail">{{ gameSettings.shuttlecockCount }} ลูก × {{ gameSettings.shuttlecockPrice }} บาท</div>
            </div>
          </div>

          <div class="col-12 col-md-3">
            <div class="cost-summary-item">
              <q-icon name="payments" size="2rem" color="orange" />
              <div class="cost-title">รวมทั้งหมด</div>
              <div class="cost-amount text-orange">{{ totalCost }} บาท</div>
              <div class="cost-detail">ค่าใช้จ่ายทั้งหมด</div>
            </div>
          </div>

          <div class="col-12 col-md-3">
            <div class="cost-summary-item">
              <q-icon name="person" size="2rem" color="red" />
              <div class="cost-title">ต่อคน</div>
              <div class="cost-amount text-red">{{ costPerPlayer }} บาท</div>
              <div class="cost-detail">{{ activePlayers.length }} คน</div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Player Payment Table -->
    <q-card class="q-mb-lg modern-card">
      <q-card-section class="bg-blue-1">
        <div class="text-h6">
          <q-icon name="list" class="q-mr-sm" />
          รายการแบ่งค่าใช้จ่าย
        </div>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="paymentList"
          :columns="paymentColumns"
          row-key="id"
          flat
          :pagination="{ rowsPerPage: 0 }"
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

          <template v-slot:body-cell-hours="props">
            <q-td :props="props">
              <q-input
                v-model.number="props.row.hoursPlayed"
                type="number"
                dense
                outlined
                min="0"
                :max="gameSettings.hoursPerSession"
                step="0.5"
                style="width: 100px"
                @update:model-value="updatePlayerCost(props.row)"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-cost="props">
            <q-td :props="props">
              <div class="text-weight-bold text-h6" :class="getCostColor(props.row.cost)">
                {{ props.row.cost }} บาท
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-toggle
                v-model="props.row.paid"
                @update:model-value="updatePaymentStatus"
                color="green"
                :label="props.row.paid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Payment Summary -->
    <div class="row q-gutter-md">
      <div class="col-12 col-md-6">
        <q-card class="modern-card">
          <q-card-section class="bg-positive text-white">
            <div class="text-h6 text-center">
              <q-icon name="account_balance_wallet" class="q-mr-sm" />
              สถานะการชำระเงิน
            </div>
          </q-card-section>

          <q-card-section>
            <div class="payment-stats">
              <div class="stat-row">
                <span>จ่ายแล้ว:</span>
                <span class="text-green text-weight-bold">{{ paidAmount }} บาท ({{ paidCount }} คน)</span>
              </div>
              <div class="stat-row">
                <span>ยังไม่จ่าย:</span>
                <span class="text-red text-weight-bold">{{ unpaidAmount }} บาท ({{ unpaidCount }} คน)</span>
              </div>
              <div class="stat-row">
                <span>เงินที่เก็บได้:</span>
                <span class="text-blue text-weight-bold">{{ totalCollected }} บาท</span>
              </div>
            </div>

            <q-linear-progress
              :value="paymentProgress"
              color="positive"
              class="q-mt-md"
              size="20px"
            >
              <div class="absolute-full flex flex-center">
                <q-badge color="white" text-color="primary" :label="`${Math.round(paymentProgress * 100)}%`" />
              </div>
            </q-linear-progress>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card class="modern-card">
          <q-card-section class="bg-info text-white">
            <div class="text-h6 text-center">
              <q-icon name="savings" class="q-mr-sm" />
              เครื่องมือเสริม
            </div>
          </q-card-section>

          <q-card-section class="q-gutter-md">
            <q-btn
              color="primary"
              label="รีเซ็ตเวลาทุกคน"
              icon="refresh"
              @click="resetAllHours"
              class="full-width"
            />

            <q-btn
              color="orange"
              label="ทำเครื่องหมายจ่ายทั้งหมด"
              icon="check_circle"
              @click="markAllPaid"
              class="full-width"
            />

            <q-btn
              color="purple"
              label="ส่งออกรายการ"
              icon="file_download"
              @click="exportPaymentList"
              class="full-width"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import { useBadmintonStore } from 'src/stores/badminton-store'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'PaymentPage',

  setup() {
    const $q = useQuasar()
    const badmintonStore = useBadmintonStore()
    const { gameSettings, activePlayers, totalCost, costPerPlayer } = storeToRefs(badmintonStore)

    const paymentColumns = [
      {
        name: 'player',
        required: true,
        label: 'ผู้เล่น',
        align: 'left',
        field: 'name',
        sortable: true
      },
      {
        name: 'hours',
        label: 'ชั่วโมงที่เล่น',
        align: 'center',
        field: 'hoursPlayed'
      },
      {
        name: 'cost',
        label: 'ค่าใช้จ่าย',
        align: 'center',
        field: 'cost',
        sortable: true
      },
      {
        name: 'status',
        label: 'สถานะ',
        align: 'center',
        field: 'paid'
      }
    ]

    const courtCost = computed(() => {
      return gameSettings.value.courts *
             gameSettings.value.hoursPerSession *
             gameSettings.value.pricePerCourtHour
    })

    const shuttleCost = computed(() => {
      return gameSettings.value.shuttlecockCount *
             gameSettings.value.shuttlecockPrice
    })

    const paymentList = computed(() => {
      return activePlayers.value.map(player => ({
        ...player,
        hoursPlayed: gameSettings.value.hoursPerSession,
        cost: costPerPlayer.value,
        paid: false
      }))
    })

    const paidCount = computed(() => {
      return paymentList.value.filter(p => p.paid).length
    })

    const unpaidCount = computed(() => {
      return paymentList.value.length - paidCount.value
    })

    const paidAmount = computed(() => {
      return paymentList.value
        .filter(p => p.paid)
        .reduce((sum, p) => sum + p.cost, 0)
    })

    const unpaidAmount = computed(() => {
      return paymentList.value
        .filter(p => !p.paid)
        .reduce((sum, p) => sum + p.cost, 0)
    })

    const totalCollected = computed(() => {
      return paidAmount.value
    })

    const paymentProgress = computed(() => {
      if (totalCost.value === 0) return 0
      return totalCollected.value / totalCost.value
    })

    const updatePlayerCost = (player) => {
      const hourlyRate = totalCost.value / (gameSettings.value.hoursPerSession * activePlayers.value.length)
      player.cost = Math.round(hourlyRate * player.hoursPlayed)
    }

    const updatePaymentStatus = () => {
      // อัพเดทสถานะการจ่ายเงิน
    }

    const resetAllHours = () => {
      paymentList.value.forEach(player => {
        player.hoursPlayed = gameSettings.value.hoursPerSession
        player.cost = costPerPlayer.value
      })

      $q.notify({
        type: 'info',
        message: 'รีเซ็ตเวลาทุกคนแล้ว',
        position: 'top'
      })
    }

    const markAllPaid = () => {
      paymentList.value.forEach(player => {
        player.paid = true
      })

      $q.notify({
        type: 'positive',
        message: 'ทำเครื่องหมายจ่ายทั้งหมดแล้ว',
        position: 'top'
      })
    }

    const exportPaymentList = () => {
      const data = paymentList.value.map(p => ({
        name: p.name,
        hours: p.hoursPlayed,
        cost: p.cost,
        paid: p.paid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'
      }))

      // แปลงเป็น CSV
      const csv = [
        'ชื่อ,ชั่วโมง,ค่าใช้จ่าย,สถานะ',
        ...data.map(row => `${row.name},${row.hours},${row.cost},${row.paid}`)
      ].join('\n')

      // ดาวน์โหลด
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'รายการค่าใช้จ่าย.csv'
      link.click()

      $q.notify({
        type: 'positive',
        message: 'ส่งออกรายการแล้ว',
        position: 'top'
      })
    }

    const getCostColor = (cost) => {
      if (cost < 50) return 'text-green'
      if (cost < 100) return 'text-orange'
      return 'text-red'
    }

    return {
      gameSettings,
      activePlayers,
      totalCost,
      costPerPlayer,
      courtCost,
      shuttleCost,
      paymentList,
      paymentColumns,
      paidCount,
      unpaidCount,
      paidAmount,
      unpaidAmount,
      totalCollected,
      paymentProgress,
      updatePlayerCost,
      updatePaymentStatus,
      resetAllHours,
      markAllPaid,
      exportPaymentList,
      getCostColor
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

.cost-summary-item {
  text-align: center;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  transition: all 0.3s ease;
}

.cost-summary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.cost-title {
  font-size: 14px;
  color: #666;
  margin: 8px 0 4px;
  font-weight: 500;
}

.cost-amount {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.cost-detail {
  font-size: 12px;
  color: #999;
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
}

.payment-stats {
  padding: 16px 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-row:last-child {
  border-bottom: none;
  font-size: 16px;
  font-weight: bold;
}
</style>

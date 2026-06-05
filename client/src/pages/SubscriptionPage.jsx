import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, ArrowLeft, Zap, Crown, Building2, CreditCard, X } from 'lucide-react'
import { subscriptionAPI } from '../utils/api'
import useStore from '../store/useStore'
import toast from 'react-hot-toast'

const planIcons = { free: Zap, pro: Crown, enterprise: Building2 }
const planColors = {
  free: 'border-gray-200 dark:border-gray-700',
  pro: 'border-brand-500 ring-2 ring-brand-500',
  enterprise: 'border-purple-500 ring-2 ring-purple-500',
}
const planBadge = {
  free: null,
  pro: { label: 'Most Popular', color: 'bg-brand-600' },
  enterprise: { label: 'Best Value', color: 'bg-purple-600' },
}

const EMPTY_CARD = { name: '', number: '', expiry: '', cvv: '' }

export default function SubscriptionPage() {
  const [plans, setPlans] = useState({})
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)
  const [payModal, setPayModal] = useState(null) // planKey being purchased
  const [card, setCard] = useState(EMPTY_CARD)
  const [payLoading, setPayLoading] = useState(false)
  const user = useStore((s) => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([subscriptionAPI.plans(), subscriptionAPI.current()]).then(
      ([{ data: p }, { data: c }]) => {
        setPlans(p)
        setCurrent(c)
        setLoading(false)
      }
    )
  }, [])

  const openPayModal = (planKey) => {
    setCard(EMPTY_CARD)
    setPayModal(planKey)
  }

  const handleCardChange = (e) => {
    const { name, value } = e.target
    let v = value
    if (name === 'number') v = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    if (name === 'expiry') v = value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')
    if (name === 'cvv') v = value.replace(/\D/g, '').slice(0, 4)
    setCard((c) => ({ ...c, [name]: v }))
  }

  const handlePaySubmit = async (e) => {
    e.preventDefault()
    if (!payModal) return
    setPayLoading(true)
    try {
      await subscriptionAPI.upgrade(payModal)
      const { data } = await subscriptionAPI.current()
      setCurrent(data)
      toast.success(`Upgraded to ${plans[payModal]?.name} plan!`)
      setPayModal(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upgrade failed')
    }
    setPayLoading(false)
  }

  const handleUpgrade = async (planKey) => {
    if (planKey === current?.current_plan) return
    // Free plan needs no payment details
    if (plans[planKey]?.price === 0) {
      try {
        setUpgrading(planKey)
        await subscriptionAPI.upgrade(planKey)
        const { data } = await subscriptionAPI.current()
        setCurrent(data)
        toast.success(`Switched to ${plans[planKey]?.name} plan!`)
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to switch plan')
      } finally {
        setUpgrading(null)
      }
      return
    }
    openPayModal(planKey)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/chat')}
          className="btn-secondary mb-8 text-sm"
        >
          <ArrowLeft size={16} /> Back to Chat
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Choose your plan</h1>
          <p className="text-gray-600 dark:text-gray-400">
            You're currently on the{' '}
            <strong className="text-brand-600 dark:text-brand-400 capitalize">
              {current?.current_plan}
            </strong>{' '}
            plan ·{' '}
            {current?.usage?.messages_today}/{current?.plan_details?.messages_per_day === -1 ? '∞' : current?.plan_details?.messages_per_day} messages today
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(plans).map(([key, plan]) => {
            const Icon = planIcons[key] || Zap
            const badge = planBadge[key]
            const isCurrent = key === current?.current_plan

            return (
              <div
                key={key}
                className={`card p-8 relative flex flex-col ${planColors[key]} transition-all hover:shadow-lg`}
              >
                {badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${badge.color} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                    {badge.label}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
                    <Icon size={20} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">/month</span>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={isCurrent || upgrading === key}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default'
                      : key === 'pro'
                      ? 'btn-primary'
                      : key === 'enterprise'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'btn-secondary'
                  }`}
                >
                  {upgrading === key ? (
                    <><Loader2 size={16} className="animate-spin" /> Upgrading...</>
                  ) : isCurrent ? (
                    '✓ Current Plan'
                  ) : (
                    `Switch to ${plan.name}`
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          Demo mode — no real charges will be made. In production, integrate with Stripe.
        </p>
      </div>
    </div>

    {/* Payment modal */}
    {/* eslint-disable-next-line */}
    {payModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-brand-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Payment Details</h3>
            </div>
            <button onClick={() => setPayModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Upgrading to <strong className="text-brand-600 dark:text-brand-400 capitalize">{plans[payModal]?.name}</strong> — ${plans[payModal]?.price}/month
          </p>

          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cardholder Name</label>
              <input
                name="name"
                value={card.name}
                onChange={handleCardChange}
                placeholder="Himaja Arabati"
                required
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
              <input
                name="number"
                value={card.number}
                onChange={handleCardChange}
                placeholder="1234 5678 9012 3456"
                required
                className="input-base font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry</label>
                <input
                  name="expiry"
                  value={card.expiry}
                  onChange={handleCardChange}
                  placeholder="MM/YY"
                  required
                  className="input-base font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CVV</label>
                <input
                  name="cvv"
                  value={card.cvv}
                  onChange={handleCardChange}
                  placeholder="•••"
                  required
                  className="input-base font-mono"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              🔒 Demo mode — no real payment is processed.
            </p>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setPayModal(null)} className="btn-secondary flex-1 justify-center py-2.5 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={payLoading} className="btn-primary flex-1 justify-center py-2.5 text-sm">
                {payLoading ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : `Pay $${plans[payModal]?.price}/mo`}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

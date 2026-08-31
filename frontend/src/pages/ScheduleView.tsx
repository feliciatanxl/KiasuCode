import { useEffect, useState, type FormEvent } from 'react'
import type { ClassScheduleItem, DayOfWeek } from '@kiasucode/shared'
import { Logo } from '../components/Logo'
import { Navbar } from '../components/Navbar'
import { TelegramConnectModal } from '../components/TelegramConnectModal'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError } from '../utils/api'

interface SchedulesResponse {
  schedules: ClassScheduleItem[]
}

interface CreateScheduleResponse {
  schedule: ClassScheduleItem
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function ScheduleView() {
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTelegramOpen, setIsTelegramOpen] = useState(false)

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [selectedScheduleForPreview, setSelectedScheduleForPreview] = useState<ClassScheduleItem | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [instructor, setInstructor] = useState('')
  const [roomLocation, setRoomLocation] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Mon')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [color, setColor] = useState('#3b82f6')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { showToast } = useToast()

  const fetchSchedules = async () => {
    try {
      setIsLoading(true)
      const { data } = await apiRequest<SchedulesResponse>('/api/schedules')
      setSchedules(data.schedules || [])
    } catch (err) {
      console.error('Failed to load class schedules:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchSchedules()
  }, [])

  const openAddModal = () => {
    setEditingScheduleId(null)
    setTitle('')
    setInstructor('')
    setRoomLocation('')
    setDayOfWeek('Mon')
    setStartTime('09:00')
    setEndTime('11:00')
    setColor('#3b82f6')
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: ClassScheduleItem) => {
    setEditingScheduleId(item.id)
    setTitle(item.title)
    setInstructor(item.instructor || '')
    setRoomLocation(item.roomLocation || '')
    setDayOfWeek(item.dayOfWeek)
    setStartTime(item.startTime)
    setEndTime(item.endTime)
    setColor(item.color || '#3b82f6')
    setSelectedScheduleForPreview(item)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      if (editingScheduleId) {
        const { data } = await apiRequest<CreateScheduleResponse>(
          `/api/schedules/${editingScheduleId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              color,
              title: title.trim(),
              instructor: instructor.trim() || null,
              roomLocation: roomLocation.trim() || null,
              dayOfWeek,
              startTime,
              endTime,
            }),
          },
        )

        setSchedules((prev) =>
          prev.map((s) => (s.id === editingScheduleId ? data.schedule : s)),
        )
        showToast(`Class "${data.schedule.title}" updated!`)
      } else {
        const { data } = await apiRequest<CreateScheduleResponse>('/api/schedules', {
          method: 'POST',
          body: JSON.stringify({
            color,
            title: title.trim(),
            instructor: instructor.trim() || null,
            roomLocation: roomLocation.trim() || null,
            dayOfWeek,
            startTime,
            endTime,
          }),
        })

        setSchedules((prev) => [...prev, data.schedule])
        showToast(`Class "${data.schedule.title}" added to schedule!`)
      }

      setIsModalOpen(false)
      setEditingScheduleId(null)
      setTitle('')
      setInstructor('')
      setRoomLocation('')
      setStartTime('09:00')
      setEndTime('11:00')
      setColor('#3b82f6')
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, classTitle: string) => {
    const original = [...schedules]
    setSchedules((prev) => prev.filter((s) => s.id !== id))
    if (selectedScheduleForPreview?.id === id) {
      setSelectedScheduleForPreview(null)
    }

    try {
      await apiRequest(`/api/schedules/${id}`, {
        method: 'DELETE',
      })
      showToast(`Removed "${classTitle}" from timetable.`)
    } catch (err) {
      setSchedules(original)
      showToast(formatApiError(err))
    }
  }

  // Filter schedules by day
  const schedulesByDay = DAYS_OF_WEEK.reduce<Record<DayOfWeek, ClassScheduleItem[]>>(
    (acc, day) => {
      acc[day] = schedules.filter((s) => s.dayOfWeek === day)
      return acc
    },
    { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
  )

  // Determine active iPod preview values
  const activeClass = isModalOpen
    ? {
        title: title.trim() || 'Class Title',
        instructor: instructor.trim() || 'Instructor Name',
        roomLocation: roomLocation.trim() || 'Room / Venue',
        dayOfWeek,
        startTime,
        endTime,
        color,
      }
    : selectedScheduleForPreview || schedules[0] || {
        title: 'Class Title',
        instructor: 'Instructor Name',
        roomLocation: 'Room / Venue',
        dayOfWeek: 'Mon' as DayOfWeek,
        startTime: '09:00',
        endTime: '11:00',
        color: '#3b82f6',
      }

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <Navbar onConnectTelegram={() => setIsTelegramOpen(true)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              schedule/timetable.sync
            </span>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Class Schedule & Timetable
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Organize lectures, tutorials, and lab slots with the iPod Classic schedule generator.
            </p>
          </div>
        </div>

        {/* SIDE-BY-SIDE SECTION: SKEUOMORPHIC IPOD CLASSIC & WEEKLY BREAKDOWN */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch mb-12">
          {/* SKEUOMORPHIC IPOD CLASSIC */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <div className="relative w-72 sm:w-80 rounded-[42px] p-5 sm:p-6 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 border-2 border-slate-300/80 dark:border-slate-600 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.9)_inset] select-none">
              {/* Gloss highlight reflex */}
              <div className="absolute top-2 left-8 right-8 h-3 rounded-full bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />

              {/* IPOD COLOR SCREEN */}
              <div className="relative rounded-2xl border-4 border-slate-900/90 bg-gradient-to-b from-[#c3e3f7] to-[#91c5e4] dark:from-[#132c3f] dark:to-[#0a1824] p-4 shadow-[inset_0_4px_10px_rgba(0,0,0,0.35)] text-slate-900 dark:text-cyan-50 flex flex-col justify-between h-48 sm:h-52 overflow-hidden font-sans">
                {/* Top Status Bar */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-900/15 dark:border-cyan-400/20 text-[11px] font-bold">
                  <div className="flex items-center gap-1">
                    <span className="text-xs">▶</span>
                    <span>Now Classing</span>
                  </div>
                  {/* Mock Battery Icon */}
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-5.5 rounded-xs border border-slate-900/70 dark:border-cyan-200/70 p-0.5 flex items-center">
                      <div className="h-full w-4/5 rounded-2xs bg-emerald-600 dark:bg-emerald-400" />
                    </div>
                    <div className="h-1.5 w-0.5 rounded-r bg-slate-900/70 dark:bg-cyan-200/70" />
                  </div>
                </div>

                {/* Main Screen Body with Dynamic Binding */}
                <div className="flex items-center gap-3 my-auto">
                  {/* Mock Album Art Badge with Chosen Color */}
                  <div
                    className="size-14 sm:size-16 rounded-xl shadow-md flex items-center justify-center text-2xl text-white font-black shrink-0 transition-colors duration-300 border border-white/40"
                    style={{ backgroundColor: activeClass.color || '#3b82f6' }}
                  >
                    🎓
                  </div>

                  {/* Metadata Fields */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-black truncate leading-tight text-slate-950 dark:text-white">
                      {activeClass.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-700 dark:text-cyan-200 truncate mt-0.5">
                      {activeClass.instructor}
                    </p>
                    <p className="text-[11px] font-mono text-slate-600 dark:text-cyan-300/80 truncate">
                      {activeClass.roomLocation}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mt-1">
                      {activeClass.dayOfWeek} · {activeClass.startTime} - {activeClass.endTime}
                    </p>
                  </div>
                </div>

                {/* Bottom Scrubber Bar */}
                <div className="pt-1.5 border-t border-slate-900/10 dark:border-cyan-400/20">
                  <div className="h-1.5 w-full rounded-full bg-slate-900/20 dark:bg-cyan-950 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-blue-600 dark:bg-cyan-400 shadow-xs" />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-600 dark:text-cyan-300 mt-0.5">
                    <span>{activeClass.startTime}</span>
                    <span>{activeClass.endTime}</span>
                  </div>
                </div>
              </div>

              {/* IPOD CLICK WHEEL */}
              <div className="mt-6 sm:mt-7 flex justify-center">
                <div className="size-40 sm:size-44 rounded-full bg-gradient-to-b from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-slate-300/90 dark:border-slate-600 shadow-[0_8px_16px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.9)] relative flex items-center justify-center">
                  {/* Menu Button Top */}
                  <span className="absolute top-2.5 text-[10px] font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    MENU
                  </span>

                  {/* Previous / Rewind Left */}
                  <span className="absolute left-3.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    |◀◀
                  </span>

                  {/* Next / Forward Right */}
                  <span className="absolute right-3.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    ▶▶|
                  </span>

                  {/* Play / Pause Bottom */}
                  <span className="absolute bottom-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    ▶||
                  </span>

                  {/* Center Select Button */}
                  <div className="size-16 sm:size-18 rounded-full bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 border border-slate-300 dark:border-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] active:scale-95 transition-transform flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                      SELECT
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <span className="mt-3 text-[11px] font-mono text-slate-400 dark:text-slate-500">
              iPod Classic · Timetable Edition
            </span>
          </div>

          {/* WEEKLY TIMETABLE SECTION */}
          <section className="flex-1 w-full h-full min-h-[520px] rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-800/90 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/80 mb-6">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  timetable.weekly
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Weekly Class Breakdown
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {schedules.length} Total Slots
                </span>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors whitespace-nowrap"
                >
                  <span>+</span> Add Class
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono my-auto">
                Loading timetable…
              </div>
            ) : schedules.length === 0 ? (
              <div className="py-12 text-center my-auto">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No classes scheduled yet.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Click the "+ Add Class" button above to populate your weekly schedule.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayClasses = schedulesByDay[day]
                  if (dayClasses.length === 0) return null

                  return (
                    <div
                      key={day}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-700/60 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-700/60 mb-3">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {day}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                          {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {dayClasses.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedScheduleForPreview(item)}
                            className="group relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all dark:border-slate-700/80 dark:bg-slate-800 cursor-pointer"
                          >
                            {/* Color strip */}
                            <div
                              className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-xl"
                              style={{ backgroundColor: item.color }}
                            />

                            <div className="pl-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditModal(item)
                                    }}
                                    className="size-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors text-xs"
                                    title="Edit class"
                                    aria-label="Edit class"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void handleDelete(item.id, item.title)
                                    }}
                                    className="size-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-xs"
                                    title="Remove class"
                                    aria-label="Remove class"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                                <span>⏱️</span>
                                <span>
                                  {item.startTime} - {item.endTime}
                                </span>
                              </div>

                              {(item.instructor || item.roomLocation) && (
                                <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  {item.instructor && (
                                    <p className="truncate">👤 {item.instructor}</p>
                                  )}
                                  {item.roomLocation && (
                                    <p className="truncate">📍 {item.roomLocation}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ADD / EDIT CLASS MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl relative dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                  {editingScheduleId ? 'form.edit' : 'form.create'}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {editingScheduleId ? 'Edit Class Schedule' : 'Add Class to Timetable'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {formError}
                </div>
              )}

              {/* Title & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Class / Module Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. CS2103 Software Engineering"
                    autoFocus
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Color Badge
                  </label>
                  <div className="flex h-11 items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="size-11 cursor-pointer rounded-xl border border-slate-300 p-0.5 dark:border-slate-700 bg-white dark:bg-slate-800"
                      title="Pick a color"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                      placeholder="#3b82f6"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Instructor & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Instructor / Professor
                  </label>
                  <input
                    type="text"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="e.g. Prof. Damith Rajapakse"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Room / Venue Location
                  </label>
                  <input
                    type="text"
                    value={roomLocation}
                    onChange={(e) => setRoomLocation(e.target.value)}
                    placeholder="e.g. COM1-0208 / LT19"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Day of the Week Toggles */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Day of the Week
                </span>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDayOfWeek(day)}
                      className={`h-10 min-w-11 px-3 rounded-xl text-xs font-bold transition-all ${
                        dayOfWeek === day
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving…'
                    : editingScheduleId
                      ? 'Save Changes'
                      : '+ Create Class Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer>
        <div className="brand brand--footer">
          <Logo className="text-[18px] text-white" />
        </div>
        <p>Built with <span>⌨</span> and kopi. Ship steady, score steady.</p>
        <code>schedule: active · latency: 0ms</code>
      </footer>

      <TelegramConnectModal
        isOpen={isTelegramOpen}
        onClose={() => setIsTelegramOpen(false)}
      />
    </div>
  )
}

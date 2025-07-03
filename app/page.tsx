"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Home,
  Plus,
  Settings,
  MapPin,
  Cloud,
  Sun,
  CloudRain,
  CloudSnowIcon as Snow,
  Download,
  Upload,
  Calendar,
  CheckCircle,
  Clock,
  Pin,
} from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

// ID生成用のユーティリティ関数
let idCounter = 1

const generateShortId = (prefix = ""): string => {
  const id = idCounter++
  return prefix ? `${prefix}${id}` : id.toString()
}

const generateSituationId = (): string => generateShortId("s")
const generateTodoId = (): string => generateShortId("t")
const generateSubTodoId = (): string => generateShortId("st")

interface SubTodo {
  id: string
  title: string
  completed: boolean
  isPinned: boolean
}

interface Todo {
  id: string
  title: string
  completed: boolean
  backgroundColor: string
  subTodos: SubTodo[]
  isPinned: boolean
}

interface Situation {
  id: string
  title: string
  detail: string
  location: string
  weather: string
  datetime: Date
  todos: Todo[]
  isPredicted?: boolean
}

// Google Calendar API関連の型定義を追加
interface CalendarEvent {
  summary: string
  description: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: string
}

export default function HomePage() {
  const [situations, setSituations] = useState<Situation[]>([])
  const [currentView, setCurrentView] = useState<"home" | "new" | "edit" | "settings">("home")
  const [editingSituation, setEditingSituation] = useState<Situation | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")
  const [activeNotifications, setActiveNotifications] = useState<Set<string>>(new Set())
  const initialScrollDoneRef = useRef(false);

  const weatherIcons = {
    sunny: Sun,
    cloudy: Cloud,
    rainy: CloudRain,
    snowy: Snow,
  }

  // Load situations from localStorage on initial render
  useEffect(() => {
    try {
      const savedSituations = localStorage.getItem("remindee_situations")
      if (savedSituations) {
        const parsedSituations = JSON.parse(savedSituations, (key, value) => {
          if (key === "datetime" || key === "lastUsed") {
            return new Date(value)
          }
          return value
        })
        setSituations(parsedSituations)
      } else {
        // Set sample data on first launch
      }
    } catch (error) {
      console.error("Failed to load situations from localStorage", error)
    }
  }, [])

  // Persist situations and update past situations template
  useEffect(() => {
    if (situations.length > 0) {
      try {
        const serializedSituations = JSON.stringify(situations)
        localStorage.setItem("remindee_situations", serializedSituations)

        const pastSituationsMap = new Map()
        const sortedSituations = [...situations].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())

        sortedSituations.forEach((situation) => {
          const existing = pastSituationsMap.get(situation.title)
          if (!existing || new Date(existing.lastUsed).getTime() < new Date(situation.datetime).getTime()) {
            pastSituationsMap.set(situation.title, {
              ...situation,
              count: (existing?.count || 0) + 1,
              lastUsed: situation.datetime,
            })
          }
        })

        const pastSituationsList = Array.from(pastSituationsMap.values())
        localStorage.setItem("reminderPastSituations", JSON.stringify(pastSituationsList))
      } catch (error) {
        console.error("Failed to save data to localStorage", error)
      }
    }
  }, [situations])

  // Notification permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then(setNotificationPermission)
    }
  }, [])

  // Scroll to current situation ONLY on initial home view
  useEffect(() => {
    if (currentView === 'home' && situations.length > 0 && !initialScrollDoneRef.current) {
      const now = new Date();
      const pastOrCurrentSituations = situations
        .filter(s => new Date(s.datetime).getTime() <= now.getTime())
        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

      const currentSituationId = pastOrCurrentSituations.length > 0 ? pastOrCurrentSituations[0].id : null;

      if (currentSituationId) {
        setTimeout(() => {
          document.getElementById(`situation-${currentSituationId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
      initialScrollDoneRef.current = true;
    }

    if (currentView !== 'home') {
      initialScrollDoneRef.current = false;
    }
  }, [currentView, situations]);


  const toggleTodoComplete = (situationId: string, todoId: string, subTodoId?: string) => {
    setSituations((prev) =>
      prev.map((s) => {
        if (s.id === situationId) {
          return {
            ...s,
            todos: s.todos.map((todo) => {
              if (todo.id === todoId) {
                if (subTodoId) {
                  return {
                    ...todo,
                    subTodos: todo.subTodos.map((sub) =>
                      sub.id === subTodoId ? { ...sub, completed: !sub.completed } : sub,
                    ),
                  }
                } else {
                  return { ...todo, completed: !todo.completed }
                }
              }
              return todo
            }),
          }
        }
        return s
      }),
    )
  }

  const scrollToSituation = (situationId: string) => {
    document.getElementById(`situation-${situationId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    })
  }

  const WeatherIcon = ({ weather }: { weather: string }) => {
    const Icon = weatherIcons[weather as keyof typeof weatherIcons] || Sun
    return <Icon className="h-4 w-4" />
  }

  if (currentView === "new") {
    return (
      <NewSituationPage
        onBack={() => setCurrentView("home")}
        onSave={(newSituation) => {
          setSituations((prev) => [...prev, newSituation].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()))
          setCurrentView("home")
        }}
      />
    )
  }

  if (currentView === "edit" && editingSituation) {
    return (
      <EditSituationPage
        situation={editingSituation}
        onBack={() => setCurrentView("home")}
        onSave={(updatedSituation) => {
          setSituations((prev) =>
            prev
              .map((s) => (s.id === updatedSituation.id ? updatedSituation : s))
              .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
          )
          setCurrentView("home")
        }}
      />
    )
  }

  if (currentView === "settings") {
    return <SettingsPage onBack={() => setCurrentView("home")} situations={situations} onImport={setSituations} />
  }

  const unfinishedTodos = situations.reduce<any[]>((acc, situation) => {
    const now = new Date()
    const pastOrCurrentSituations = situations
        .filter((s) => new Date(s.datetime).getTime() <= now.getTime())
        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
    const currentSituationId = pastOrCurrentSituations.length > 0 ? pastOrCurrentSituations[0].id : null;

    const isPast = new Date(situation.datetime).getTime() < now.getTime()
    if (isPast && situation.id !== currentSituationId) {
      situation.todos.forEach((todo) => {
        if (!todo.completed) {
          acc.push({ todo, situationTitle: situation.title, situationId: situation.id, backgroundColor: todo.backgroundColor })
        }
        todo.subTodos.forEach((subTodo) => {
          if (!subTodo.completed) {
            acc.push({ todo: subTodo, situationTitle: situation.title, situationId: situation.id, isSubTodo: true, backgroundColor: todo.backgroundColor })
          }
        })
      })
    }
    return acc
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 text-center">
        <h1 className="text-lg font-medium">Remindee</h1>
      </div>

      <div className="flex-1 px-4 pb-20">
        <div className="mb-6">
          <h2 className="text-base font-medium mb-2">やり残し</h2>
          <div className="space-y-0 h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {unfinishedTodos.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">やり残しはありません</p>
            ) : (
              unfinishedTodos.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-1 px-2 text-sm cursor-pointer hover:bg-gray-50"
                  style={{ backgroundColor: item.backgroundColor }}
                  onClick={() => scrollToSituation(item.situationId)}
                >
                  <span className="truncate flex-1">
                    {item.isSubTodo ? "　" : ""} {item.todo.title}
                  </span>
                  <span className="text-xs text-gray-600 ml-2 flex-shrink-0">{item.situationTitle}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium mb-2">場面</h2>
          <div 
            className="space-y-4 max-h-96 overflow-y-auto" 
            id="situations-container"
          >
            {situations.map((situation) => (
              <div
                key={situation.id}
                id={`situation-${situation.id}`}
                className={cn("border rounded-lg p-3 bg-white border-gray-200", situation.isPredicted && "text-gray-500")}
              >
                <div className="flex justify-between items-start mb-2">
                  <button
                    className="text-left font-medium text-sm hover:text-blue-600"
                    onClick={() => {
                      setEditingSituation(situation)
                      setCurrentView("edit")
                    }}
                  >
                    {situation.title}
                  </button>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>{formatDateTime(situation.datetime)}</span>
                    {!situation.isPredicted && (
                      <>
                        <WeatherIcon weather={situation.weather} />
                        <MapPin className="h-3 w-3" />
                        <span>{situation.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {situation.todos.map((todo) => (
                    <div key={todo.id}>
                      <div
                        className={cn(
                          "flex items-center gap-2 text-sm py-1 px-2",
                          todo.subTodos.length > 0 ? "rounded-t-md rounded-bl-md" : "rounded-md",
                          todo.completed && "line-through text-gray-400",
                        )}
                        style={{ backgroundColor: todo.backgroundColor }}
                      >
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => toggleTodoComplete(situation.id, todo.id)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1">{todo.title}</span>
                      </div>
                      {todo.subTodos.map((subTodo, subIndex) => (
                        <div
                          key={subTodo.id}
                          className={cn(
                            "flex items-center gap-2 py-1 px-2 ml-4 text-sm",
                            subIndex === todo.subTodos.length - 1 ? "rounded-b-md" : "",
                            subTodo.completed && "line-through text-gray-400",
                          )}
                          style={{ backgroundColor: todo.backgroundColor }}
                        >
                          <Checkbox
                            checked={subTodo.completed}
                            onCheckedChange={() => toggleTodoComplete(situation.id, todo.id, subTodo.id)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1">{subTodo.title}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-center items-center gap-8">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => setCurrentView("home")}>
            <Home className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" className="px-4 py-2 rounded-full" onClick={() => setCurrentView("new")}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2" onClick={() => setCurrentView("settings")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SettingsPage({
  onBack,
  situations,
  onImport,
}: {
  onBack: () => void
  situations: Situation[]
  onImport: (situations: Situation[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const googleSignInButtonRef = useRef<HTMLDivElement>(null)
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false)
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
  const [tokenClient, setTokenClient] = useState<any>(null)

  useEffect(() => {
    const gapiScript = document.createElement("script")
    gapiScript.src = "https://apis.google.com/js/api.js"
    gapiScript.async = true
    gapiScript.defer = true
    gapiScript.onload = () => window.gapi.load("client", initializeGapiClient)
    document.head.appendChild(gapiScript)

    const gisScript = document.createElement("script")
    gisScript.src = "https://accounts.google.com/gsi/client"
    gisScript.async = true
    gisScript.defer = true
    gisScript.onload = initializeGisClient
    document.head.appendChild(gisScript)

    return () => {
      document.head.removeChild(gapiScript)
      document.head.removeChild(gisScript)
    }
  }, [])

  const initializeGapiClient = async () => {
    await window.gapi.client.init({})
  }

  const initializeGisClient = () => {
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      callback: handleCredentialResponse,
    })
    if (googleSignInButtonRef.current) {
      window.google.accounts.id.renderButton(googleSignInButtonRef.current, { theme: "outline", size: "large" })
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      scope: "https://www.googleapis.com/auth/calendar",
      callback: (tokenResponse: any) => {
        if (tokenResponse?.access_token) {
          window.gapi.client.setToken(tokenResponse)
          setIsGoogleSignedIn(true)
        }
      },
    })
    setTokenClient(client)
  }

  const handleCredentialResponse = (response: any) => {
    setIsGoogleSignedIn(true)
    alert("Googleアカウントにサインインしました。")
  }

  const signOutFromGoogle = () => {
    const token = window.gapi.client.getToken()
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken(null)
        setIsGoogleSignedIn(false)
      })
    } else {
      setIsGoogleSignedIn(false)
    }
  }

  const exportToGoogleCalendar = async () => {
    if (!window.gapi.client.getToken()) {
      tokenClient?.requestAccessToken({ prompt: "consent" })
      return
    }
    setIsCalendarLoading(true)
    try {
      await window.gapi.client.load("calendar", "v3")
      for (const situation of situations) {
        const event = {
          summary: situation.title,
          description: situation.detail,
          start: { dateTime: new Date(situation.datetime).toISOString() },
          end: { dateTime: new Date(new Date(situation.datetime).getTime() + 60 * 60 * 1000).toISOString() },
          location: situation.location,
        }
        await window.gapi.client.calendar.events.insert({ calendarId: "primary", resource: event })
      }
      alert("カレンダーへのエクスポートが完了しました。")
    } catch (error) {
      console.error("Calendar export failed:", error)
      alert("カレンダーエクスポートに失敗しました")
    } finally {
      setIsCalendarLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-medium text-center mb-6">設定</h1>
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
            <h3 className="text-base font-medium mb-2">Googleカレンダー連携</h3>
            <div className="space-y-2">
              {!isGoogleSignedIn ? (
                <div ref={googleSignInButtonRef} className="flex justify-center"></div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    Googleアカウントに接続済み
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportToGoogleCalendar} className="flex-1" variant="outline" disabled={isCalendarLoading}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {isCalendarLoading ? "エクスポート中..." : "カレンダーにエクスポート"}
                    </Button>
                    <Button onClick={signOutFromGoogle} variant="ghost" size="sm">サインアウト</Button>
                  </div>
                </>
              )}
            </div>
          </div>
      </div>
      <div className="mt-8 pb-8">
        <Button onClick={onBack} variant="outline" className="w-full">戻る</Button>
      </div>
    </div>
  )
}

function NewSituationPage({
  onBack,
  onSave,
}: {
  onBack: () => void
  onSave: (situation: Situation) => void
}) {
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [location, setLocation] = useState("")
  const [todos, setTodos] = useState<Todo[]>([
    { id: generateTodoId(), title: "", completed: false, backgroundColor: "#ffffff", subTodos: [], isPinned: false },
  ])
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  const [pastSituations, setPastSituations] = useState<any[]>([])
  const [showSituationList, setShowSituationList] = useState(false)
  const [datetime, setDatetime] = useState(new Date())
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("reminderPastSituations")
    if (saved) {
      setPastSituations(JSON.parse(saved))
    }
  }, [])

  const colors = ["#ffffff", "#e3f2fd", "#e8f5e8", "#fff3e0", "#ffebee", "#f3e5f5", "#e0f2f1"]

  const addTodo = () => {
    setTodos([...todos, { id: generateTodoId(), title: "", completed: false, backgroundColor: "#ffffff", subTodos: [], isPinned: false }])
  }

  const addSubTodo = (todoId: string) => {
    setTodos(todos.map(t => t.id === todoId ? { ...t, subTodos: [...t.subTodos, { id: generateSubTodoId(), title: "", completed: false, isPinned: false }] } : t))
  }

  const updateTodo = (todoId: string, field: string, value: any) => {
    setTodos(todos.map(t => t.id === todoId ? { ...t, [field]: value } : t))
  }

  const updateSubTodo = (todoId: string, subTodoId: string, value: string) => {
    setTodos(todos.map(t => t.id === todoId ? { ...t, subTodos: t.subTodos.map(st => st.id === subTodoId ? { ...st, title: value } : st) } : t))
  }

  const setTodoColor = (todoId: string, color: string) => {
    updateTodo(todoId, "backgroundColor", color)
    setShowColorPicker(null)
  }

  const togglePin = (todoId: string, subTodoId?: string) => {
    setTodos(todos.map(t => {
      if (t.id === todoId) {
        if (subTodoId) {
          return { ...t, subTodos: t.subTodos.map(st => st.id === subTodoId ? { ...st, isPinned: !st.isPinned } : st) }
        } else {
          return { ...t, isPinned: !t.isPinned }
        }
      }
      return t
    }))
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ id: generateSituationId(), title: title.trim(), detail: detail.trim(), location, weather: "sunny", datetime, todos, isPredicted: false })
  }

  const restoreFromPast = (pastSituation: any) => {
    setTitle(pastSituation.title)
    setDetail(pastSituation.detail)
    setLocation(pastSituation.location)
    const restoredTodos = pastSituation.todos
      .map((todo: Todo) => {
        const newSubTodos = todo.subTodos.filter((st) => st.isPinned)
        if (todo.isPinned || newSubTodos.length > 0) {
          return {
            ...todo,
            id: generateTodoId(),
            completed: false,
            subTodos: newSubTodos.map((st) => ({ ...st, id: generateSubTodoId(), completed: false })),
          }
        }
        return null
      })
      .filter((t: Todo | null): t is Todo => t !== null)
    setTodos(restoredTodos.length > 0 ? restoredTodos : [{ id: generateTodoId(), title: "", completed: false, backgroundColor: "#ffffff", subTodos: [], isPinned: false }])
    setShowSituationList(false)
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-medium text-center mb-6">場面入力</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">場面</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded-md" placeholder="場面名を入力" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2 flex-1">
          {pastSituations.slice(0, 4).map((s, i) => <button key={i} onClick={() => restoreFromPast(s)} className="text-sm text-gray-600 hover:text-blue-600">{s.title}</button>)}
        </div>
        <button onClick={() => setShowSituationList(true)} className="text-sm text-blue-600">リスト</button>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">やること</label>
        <div className="space-y-2">
          {todos.map((todo) => (
            <div key={todo.id}>
              <div className="flex items-center gap-2 p-2 rounded-md border" style={{ backgroundColor: todo.backgroundColor }}>
                <input type="text" value={todo.title} onChange={(e) => updateTodo(todo.id, "title", e.target.value)} className="flex-1 bg-transparent outline-none" placeholder="やることを入力" />
                <button onClick={() => setShowColorPicker(showColorPicker === todo.id ? null : todo.id)} className="w-6 h-6 rounded-full border" style={{ backgroundColor: todo.backgroundColor }} />
                <button onClick={() => addSubTodo(todo.id)} className="p-1"><Plus className="h-4 w-4" /></button>
                <button onClick={() => togglePin(todo.id)} className="p-1"><Pin className={cn("h-4 w-4", todo.isPinned && "fill-yellow-400")} /></button>
              </div>
              {showColorPicker === todo.id && (
                <div className="flex gap-1 mt-1 p-2 bg-gray-50 rounded">
                  {colors.map(c => <button key={c} onClick={() => setTodoColor(todo.id, c)} className="w-6 h-6 rounded-full border" style={{ backgroundColor: c }} />)}
                </div>
              )}
              {todo.subTodos.map(st => (
                <div key={st.id} className="ml-4 mt-1 p-2 rounded-md border flex items-center gap-2" style={{ backgroundColor: todo.backgroundColor }}>
                  <input type="text" value={st.title} onChange={(e) => updateSubTodo(todo.id, st.id, e.target.value)} className="w-full bg-transparent outline-none" placeholder="サブタスク" />
                  <button onClick={() => togglePin(todo.id, st.id)} className="p-1"><Pin className={cn("h-4 w-4", st.isPinned && "fill-yellow-400")} /></button>
                </div>
              ))}
            </div>
          ))}
          <button onClick={addTodo} className="p-1"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      {showSituationList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">過去の場面</h3>
            {pastSituations.map((s, i) => <button key={i} onClick={() => restoreFromPast(s)} className="block w-full text-left py-2 border-b">{s.title}</button>)}
            <Button onClick={() => setShowSituationList(false)} variant="outline" className="w-full mt-4">閉じる</Button>
          </div>
        </div>
      )}
      <div className="flex gap-4 pb-8">
        <Button variant="outline" onClick={onBack} className="flex-1">キャンセル</Button>
        <Button onClick={handleSave} className="flex-1" disabled={!title.trim()}>保存</Button>
      </div>
    </div>
  )
}

function EditSituationPage({
  situation,
  onBack,
  onSave,
}: {
  situation: Situation
  onBack: () => void
  onSave: (situation: Situation) => void
}) {
  const [title, setTitle] = useState(situation.title)
  const [detail, setDetail] = useState(situation.detail)
  const [location, setLocation] = useState(situation.location)
  const [todos, setTodos] = useState<Todo[]>(situation.todos)
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null)
  const [datetime, setDatetime] = useState(new Date(situation.datetime))

  const colors = ["#ffffff", "#e3f2fd", "#e8f5e8", "#fff3e0", "#ffebee", "#f3e5f5", "#e0f2f1"]

  const addTodo = () => {
    setTodos([...todos, { id: generateTodoId(), title: "", completed: false, backgroundColor: "#ffffff", subTodos: [], isPinned: false }])
  }

  const addSubTodo = (todoId: string) => {
    setTodos(todos.map(t => t.id === todoId ? { ...t, subTodos: [...t.subTodos, { id: generateSubTodoId(), title: "", completed: false, isPinned: false }] } : t))
  }

  const updateTodo = (todoId: string, field: string, value: any) => {
    setTodos(todos.map(t => t.id === todoId ? { ...t, [field]: value } : t))
  }

  const updateSubTodo = (todoId: string, subTodoId: string, value: string) => {
    setTodos(todos.map(t => t.id === todoId ? { ...t, subTodos: t.subTodos.map(st => st.id === subTodoId ? { ...st, title: value } : st) } : t))
  }

  const setTodoColor = (todoId: string, color: string) => {
    updateTodo(todoId, "backgroundColor", color)
    setShowColorPicker(null)
  }

  const togglePin = (todoId: string, subTodoId?: string) => {
    setTodos(todos.map(t => {
      if (t.id === todoId) {
        if (subTodoId) {
          return { ...t, subTodos: t.subTodos.map(st => st.id === subTodoId ? { ...st, isPinned: !st.isPinned } : st) }
        } else {
          return { ...t, isPinned: !t.isPinned }
        }
      }
      return t
    }))
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ ...situation, title: title.trim(), detail: detail.trim(), location, datetime, todos })
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-medium text-center mb-6">場面編集</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">場面</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded-md" />
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">やること</label>
        <div className="space-y-2">
          {todos.map((todo) => (
            <div key={todo.id}>
              <div className="flex items-center gap-2 p-2 rounded-md border" style={{ backgroundColor: todo.backgroundColor }}>
                <input type="text" value={todo.title} onChange={(e) => updateTodo(todo.id, "title", e.target.value)} className="flex-1 bg-transparent outline-none" />
                <button onClick={() => setShowColorPicker(showColorPicker === todo.id ? null : todo.id)} className="w-6 h-6 rounded-full border" style={{ backgroundColor: todo.backgroundColor }} />
                <button onClick={() => addSubTodo(todo.id)} className="p-1"><Plus className="h-4 w-4" /></button>
                <button onClick={() => togglePin(todo.id)} className="p-1"><Pin className={cn("h-4 w-4", todo.isPinned && "fill-yellow-400")} /></button>
              </div>
              {showColorPicker === todo.id && (
                <div className="flex gap-1 mt-1 p-2 bg-gray-50 rounded">
                  {colors.map(c => <button key={c} onClick={() => setTodoColor(todo.id, c)} className="w-6 h-6 rounded-full border" style={{ backgroundColor: c }} />)}
                </div>
              )}
              {todo.subTodos.map(st => (
                <div key={st.id} className="ml-4 mt-1 p-2 rounded-md border flex items-center gap-2" style={{ backgroundColor: todo.backgroundColor }}>
                  <input type="text" value={st.title} onChange={(e) => updateSubTodo(todo.id, st.id, e.target.value)} className="w-full bg-transparent outline-none" />
                  <button onClick={() => togglePin(todo.id, st.id)} className="p-1"><Pin className={cn("h-4 w-4", st.isPinned && "fill-yellow-400")} /></button>
                </div>
              ))}
            </div>
          ))}
          <button onClick={addTodo} className="p-1"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex gap-4 pb-8">
        <Button variant="outline" onClick={onBack} className="flex-1">キャンセル</Button>
        <Button onClick={handleSave} className="flex-1" disabled={!title.trim()}>保存</Button>
      </div>
    </div>
  )
}
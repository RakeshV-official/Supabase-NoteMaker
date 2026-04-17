'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, MoreHorizontal, Edit2, Trash2, LogOut, User, Sparkles, Clock, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@/lib/supabase'

// 🎯 TypeScript Integration (Feature #4: Auto-generated APIs)
type Board = Database['public']['Tables']['boards']['Row']
type List = Database['public']['Tables']['lists']['Row']
type Card = Database['public']['Tables']['cards']['Row']

interface KanbanData {
  boards: Board[]
  lists: List[]
  cards: Card[]
}

export default function KanbanBoard() {
  // 🔐 FEATURE #1: Authentication (using AuthContext)
  const { user, signOut } = useAuth()

  // 📊 State Management
  const [data, setData] = useState<KanbanData>({ boards: [], lists: [], cards: [] })
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [newCardTitles, setNewCardTitles] = useState<{ [listId: string]: string }>({})
  const [newListTitle, setNewListTitle] = useState('')

  // 🎉 Notification State (Feature #6: Edge Functions)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  }>({ show: false, message: '', type: 'success' })

  // 🔒 Lock to prevent realtime refetch during drag operations
  const isUpdatingRef = useRef(false)

  // ===============================================
  // 🎯 FEATURE #4: AUTO-GENERATED REST APIs (READ)
  // ===============================================
  const fetchData = useCallback(async () => {
    try {
      console.log('📥 Fetching data with Supabase auto-generated APIs...')

      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false })

      if (boardsError) throw boardsError

      if (!boards || boards.length === 0) {
        await createSampleData()
        return
      }

      const firstBoard = boards[0]
      setCurrentBoard(firstBoard)

      const { data: lists, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('board_id', firstBoard.id)
        .order('position', { ascending: true })

      if (listsError) throw listsError

      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .in('list_id', lists.map(list => list.id))
        .order('position', { ascending: true })

      if (cardsError) throw cardsError

      setData({ boards: boards || [], lists: lists || [], cards: cards || [] })
      console.log('✅ Data fetched successfully!')
    } catch (error) {
      console.error('❌ Error fetching data:', error)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ===============================================
  // 🎯 FEATURE #3: REAL-TIME SUBSCRIPTIONS
  // ===============================================
  const setupRealtimeSubscriptions = useCallback(() => {
    console.log('🔄 Setting up real-time subscriptions...')

    const subscription = supabase
      .channel('kanban-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, (payload) => {
        console.log('📋 Board updated in real-time:', payload)
        if (!isUpdatingRef.current) fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, (payload) => {
        console.log('📝 List updated in real-time:', payload)
        if (!isUpdatingRef.current) fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload) => {
        console.log('🎴 Card updated in real-time:', payload)
        // Skip refetch if WE are the ones updating (prevents snap-back during drag)
        if (isUpdatingRef.current) {
          console.log('⏭️ Skipping refetch — local drag in progress')
          return
        }
        setTimeout(() => fetchData(), 300)
      })
      .subscribe()

    return () => {
      console.log('🧹 Cleaning up real-time subscriptions')
      subscription.unsubscribe()
    }
  }, [fetchData])

  // 🚀 Initialize: Data + Realtime
  useEffect(() => {
    if (user) {
      fetchData()
      const cleanup = setupRealtimeSubscriptions()
      return cleanup
    }
  }, [user, fetchData, setupRealtimeSubscriptions])

  // ===============================================
  // 🎯 FEATURE #6: EDGE FUNCTIONS (Serverless)
  // ===============================================
  const triggerCompletionNotification = async ({ cardId, cardTitle, listTitle, userEmail }: {
    cardId: string
    cardTitle: string
    listTitle: string
    userEmail: string
  }) => {
    try {
      console.log('🚀 Calling edge function for task completion...')

      const { data, error } = await supabase.functions.invoke('task-completion-notification', {
        body: { cardId, cardTitle, listTitle, userEmail }
      })

      if (error) {
        console.error('❌ Edge function error:', error)
        showNotification(`Failed to send notification: ${error.message}`, 'error')
        return
      }

      if (data?.success) {
        console.log('🎉 Notification sent:', data.message)
        showNotification(`🎉 Notification sent for "${cardTitle}"!`, 'success')
      }
    } catch (error) {
      console.error('❌ Error calling edge function:', error)
      showNotification('Failed to send notification', 'error')
    }
  }

  // 🎉 Show UI notification
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' })
    }, 3000)
  }

  // ===============================================
  // 🎯 FEATURE #4: AUTO-GENERATED REST APIs (CREATE)
  // ===============================================
  const createSampleData = async () => {
    try {
      console.log('🌱 Creating sample data for new user...')

      const { data: board, error: boardError } = await supabase
        .from('boards')
        .insert({
          title: 'My First Board',
          description: 'A sample Kanban board to get you started',
          user_id: user?.id
        })
        .select()
        .single()

      if (boardError) throw boardError

      const { data: lists, error: listsError } = await supabase
        .from('lists')
        .insert([
          { title: 'To Do', board_id: board.id, position: 0 },
          { title: 'In Progress', board_id: board.id, position: 1 },
          { title: 'Done', board_id: board.id, position: 2 }
        ])
        .select()

      if (listsError) throw listsError

      const todoListId = lists.find(list => list.title === 'To Do')?.id
      const inProgressListId = lists.find(list => list.title === 'In Progress')?.id

      if (todoListId && inProgressListId) {
        await supabase
          .from('cards')
          .insert([
            {
              title: 'Welcome to your Kanban board!',
              description: 'This is your first card. You can edit or delete it.',
              list_id: todoListId,
              position: 0
            },
            {
              title: 'Drag and drop cards',
              description: 'Try dragging this card to different lists',
              list_id: todoListId,
              position: 1
            },
            {
              title: 'Real-time updates',
              description: 'Changes appear instantly across all devices',
              list_id: inProgressListId,
              position: 0
            }
          ])
      }

      console.log('✅ Sample data created!')
      fetchData()
    } catch (error) {
      console.error('❌ Error creating sample data:', error)
    }
  }

  const addCard = async (listId: string) => {
    const cardTitle = newCardTitles[listId]?.trim()
    if (!cardTitle) return

    console.log('➕ Adding new card:', cardTitle)

    const tempId = `temp-${Date.now()}`
    const nextPosition = data.cards.filter(card => card.list_id === listId).length
    const optimisticCard: Card = {
      id: tempId,
      title: cardTitle,
      description: null,
      list_id: listId,
      position: nextPosition,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setData(prevData => ({
      ...prevData,
      cards: [...prevData.cards, optimisticCard]
    }))

    setNewCardTitles(prev => ({ ...prev, [listId]: '' }))

    try {
      isUpdatingRef.current = true
      const { data: insertedCard, error } = await supabase
        .from('cards')
        .insert({
          title: cardTitle,
          list_id: listId,
          position: nextPosition
        })
        .select()
        .single()

      if (error) throw error

      setData(prevData => ({
        ...prevData,
        cards: prevData.cards.map(card =>
          card.id === tempId ? insertedCard : card
        )
      }))

      console.log('✅ Card added successfully!')
    } catch (error) {
      console.error('❌ Error adding card:', error)
      setData(prevData => ({
        ...prevData,
        cards: prevData.cards.filter(card => card.id !== tempId)
      }))
      setNewCardTitles(prev => ({ ...prev, [listId]: cardTitle }))
    } finally {
      setTimeout(() => { isUpdatingRef.current = false }, 500)
    }
  }

  const addList = async () => {
    if (!newListTitle.trim() || !currentBoard) return

    console.log('📝 Adding new list:', newListTitle)

    const tempId = `temp-${Date.now()}`
    const optimisticList: List = {
      id: tempId,
      title: newListTitle,
      board_id: currentBoard.id,
      position: data.lists.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setData(prevData => ({
      ...prevData,
      lists: [...prevData.lists, optimisticList]
    }))

    const listTitle = newListTitle
    setNewListTitle('')

    try {
      isUpdatingRef.current = true
      const { data: insertedList, error } = await supabase
        .from('lists')
        .insert({
          title: listTitle,
          board_id: currentBoard.id,
          position: optimisticList.position
        })
        .select()
        .single()

      if (error) throw error

      setData(prevData => ({
        ...prevData,
        lists: prevData.lists.map(list =>
          list.id === tempId ? insertedList : list
        )
      }))

      console.log('✅ List added successfully!')
    } catch (error) {
      console.error('❌ Error adding list:', error)
      setData(prevData => ({
        ...prevData,
        lists: prevData.lists.filter(list => list.id !== tempId)
      }))
      setNewListTitle(listTitle)
    } finally {
      setTimeout(() => { isUpdatingRef.current = false }, 500)
    }
  }

  // ===============================================
  // 🎯 FEATURE #4: AUTO-GENERATED REST APIs (UPDATE)
  // ===============================================
  // 🛠️ FIXED: properly reindex BOTH source and destination lists,
  // persist ALL changed positions to the DB, and guard against
  // realtime snap-back with isUpdatingRef.
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    // No change
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    console.log('🎯 Updating card position with drag & drop...')

    const cardId = draggableId
    const sourceListId = source.droppableId
    const destinationListId = destination.droppableId
    const sameList = sourceListId === destinationListId

    // Snapshot data we need BEFORE the optimistic update
    const draggedCard = data.cards.find(c => c.id === cardId)
    if (!draggedCard) return

    const destinationList = data.lists.find(list => list.id === destinationListId)

    // --- Build new card layout immutably ---
    let reindexedSource: Card[] = []
    let reindexedDest: Card[] = []

    if (sameList) {
      // Single-list reorder
      const listCards = data.cards
        .filter(c => c.list_id === sourceListId)
        .sort((a, b) => a.position - b.position)

      const movedFrom = listCards.findIndex(c => c.id === cardId)
      const [moved] = listCards.splice(movedFrom, 1)
      listCards.splice(destination.index, 0, moved)

      reindexedDest = listCards.map((c, i) => ({ ...c, position: i }))
    } else {
      // Cross-list move
      const sourceCards = data.cards
        .filter(c => c.list_id === sourceListId && c.id !== cardId)
        .sort((a, b) => a.position - b.position)

      const destCards = data.cards
        .filter(c => c.list_id === destinationListId)
        .sort((a, b) => a.position - b.position)

      const movedCard: Card = { ...draggedCard, list_id: destinationListId }
      destCards.splice(destination.index, 0, movedCard)

      reindexedSource = sourceCards.map((c, i) => ({ ...c, position: i }))
      reindexedDest = destCards.map((c, i) => ({ ...c, position: i }))
    }

    const untouchedCards = data.cards.filter(c =>
      c.list_id !== sourceListId && c.list_id !== destinationListId
    )

    // Optimistic UI update
    setData(prev => ({
      ...prev,
      cards: [...untouchedCards, ...reindexedSource, ...reindexedDest]
    }))

    // Persist to DB
    isUpdatingRef.current = true
    try {
      const changedCards = [...reindexedSource, ...reindexedDest]

      // Fire all updates in parallel
      const results = await Promise.all(
        changedCards.map(card =>
          supabase
            .from('cards')
            .update({ list_id: card.list_id, position: card.position })
            .eq('id', card.id)
        )
      )

      const firstError = results.find(r => r.error)
      if (firstError?.error) throw firstError.error

      console.log('✅ All card positions updated!')

      // 🎯 FEATURE #6: EDGE FUNCTIONS — trigger on moving to "Done"
      if (destinationList && !sameList && user && destinationList.title === 'Done') {
        await triggerCompletionNotification({
          cardId: draggedCard.id,
          cardTitle: draggedCard.title,
          listTitle: destinationList.title,
          userEmail: user.email || 'user@example.com'
        })
      }
    } catch (error) {
      console.error('❌ Error updating card positions:', error)
      fetchData() // Roll back to server state
    } finally {
      // Release lock after enough time for realtime broadcast to arrive & be skipped
      setTimeout(() => { isUpdatingRef.current = false }, 1000)
    }
  }

  // ===============================================
  // 🎯 FEATURE #4: AUTO-GENERATED REST APIs (DELETE)
  // ===============================================
  const deleteCard = async (cardId: string) => {
    console.log('🗑️ Deleting card...')

    const cardToDelete = data.cards.find(card => card.id === cardId)
    if (!cardToDelete) return

    setData(prevData => ({
      ...prevData,
      cards: prevData.cards.filter(card => card.id !== cardId)
    }))

    try {
      isUpdatingRef.current = true
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId)

      if (error) throw error
      console.log('✅ Card deleted successfully!')
    } catch (error) {
      console.error('❌ Error deleting card:', error)
      setData(prevData => ({
        ...prevData,
        cards: [...prevData.cards, cardToDelete].sort((a, b) => a.position - b.position)
      }))
    } finally {
      setTimeout(() => { isUpdatingRef.current = false }, 500)
    }
  }

  // Helper: format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Helper: list color
  const getListColor = (title: string) => {
    switch (title.toLowerCase()) {
      case 'to do':
        return 'from-blue-500 to-blue-600'
      case 'in progress':
        return 'from-yellow-500 to-orange-500'
      case 'done':
        return 'from-green-500 to-emerald-600'
      default:
        return 'from-purple-500 to-indigo-600'
    }
  }

  // ===============================================
  // 🎨 UI COMPONENTS
  // ===============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto pulse-glow"></div>
            <Sparkles className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-slate-600 font-medium">Loading your workspace...</p>
          <p className="text-sm text-slate-500 mt-2">Preparing your boards and cards</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header with Glass Effect */}
      <header className="glass border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Kanban Pro
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">Powered by Supabase</p>
                </div>
              </div>

              {currentBoard && (
                <div className="hidden md:block">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">{currentBoard.title}</h2>
                      <p className="text-sm text-slate-600">{currentBoard.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3 px-4 py-2 bg-white/60 rounded-full border border-white/20">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-700">{user?.email}</p>
                  <p className="text-xs text-slate-500">Online</p>
                </div>
              </div>

              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white/60 rounded-full transition-all duration-200 border border-transparent hover:border-white/20"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Kanban Board */}
      <div className="p-6 lg:p-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 pb-6" style={{ overflowX: 'auto', overflowY: 'visible' }}>
            {data.lists
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((list, listIndex) => (
                <div key={list.id} className="flex-shrink-0 w-80 slide-in-up" style={{ animationDelay: `${listIndex * 0.1}s` }}>
                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
                    {/* List Header */}
                    <div className={`p-6 bg-gradient-to-r ${getListColor(list.title)} text-white relative rounded-t-2xl overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-white/80 rounded-full"></div>
                            <h3 className="font-bold text-lg">{list.title}</h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                              {data.cards.filter(card => card.list_id === list.id).length}
                            </span>
                            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={list.id}>
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`p-4 min-h-[300px] transition-all duration-300 ${snapshot.isDraggingOver
                            ? 'bg-gradient-to-b from-blue-50 to-indigo-50 border-2 border-dashed border-indigo-300'
                            : 'bg-transparent'
                            }`}
                        >
                          {/* 🛠️ FIXED: sort by position before mapping (was rendering in insertion order) */}
                          {data.cards
                            .filter(card => card.list_id === list.id)
                            .sort((a, b) => a.position - b.position)
                            .map((card, index) => (
                              <Draggable key={card.id} draggableId={card.id} index={index}>
                                {(provided, snapshot) => {
                                  const cardElement = (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{
                                        ...provided.draggableProps.style,
                                        zIndex: snapshot.isDragging ? 9999 : 'auto',
                                      }}
                                      className={`mb-4 group ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-400' : 'card-hover'}`}
                                    >
                                      <div className="bg-white rounded-xl shadow-lg border border-slate-200/60">
                                        <div className="p-5">
                                          <div className="flex items-start justify-between mb-3">
                                            <h4 className="font-semibold text-slate-800 leading-snug flex-1 pr-2">
                                              {card.title}
                                            </h4>
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => deleteCard(card.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {card.description && (
                                            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                              {card.description}
                                            </p>
                                          )}

                                          <div className="flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center space-x-2">
                                              <Clock className="w-3.5 h-3.5" />
                                              <span>{formatDate(card.created_at)}</span>
                                            </div>
                                            {list.title === 'Done' && (
                                              <div className="flex items-center space-x-1 text-green-600">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span className="font-medium">Complete</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className={`h-1 bg-gradient-to-r ${getListColor(list.title)} opacity-60`}></div>
                                      </div>
                                    </div>
                                  )

                                  // 🛠️ PORTAL FIX: When dragging, render through document.body
                                  // This escapes ALL parent stacking contexts (backdrop-blur, transform, overflow)
                                  if (snapshot.isDragging && typeof document !== 'undefined') {
                                    return createPortal(cardElement, document.body)
                                  }
                                  return cardElement
                                }}
                              </Draggable>
                            ))}
                          {provided.placeholder}

                          {/* Add Card Form */}
                          <div className="mt-4">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="✨ Add a new card..."
                                value={newCardTitles[list.id] || ''}
                                onChange={(e) => setNewCardTitles(prev => ({ ...prev, [list.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && addCard(list.id)}
                                className="w-full p-4 text-sm bg-white/60 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-slate-400 backdrop-blur-sm"
                              />
                              <Plus className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            </div>

                            {newCardTitles[list.id] && (
                              <div className="mt-3 flex gap-2">
                                <button
                                  onClick={() => addCard(list.id)}
                                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                  Add Card
                                </button>
                                <button
                                  onClick={() => setNewCardTitles(prev => ({ ...prev, [list.id]: '' }))}
                                  className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              ))}

            {/* Add New List */}
            <div className="flex-shrink-0 w-80">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-slate-300 p-6 hover:border-indigo-400 hover:bg-white/80 transition-all duration-300">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-6 h-6 text-slate-600" />
                  </div>
                  <input
                    type="text"
                    placeholder="Add a new list..."
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addList()}
                    className="w-full p-3 text-sm bg-white/80 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center"
                  />
                  {newListTitle && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={addList}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                      >
                        Add List
                      </button>
                      <button
                        onClick={() => setNewListTitle('')}
                        className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DragDropContext>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm max-w-md ${notification.type === 'success'
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
            : 'bg-red-50/90 border-red-200 text-red-800'
            }`}>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
              <p className="font-medium text-sm flex-1">{notification.message}</p>
              <button
                onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                className={`text-xl leading-none font-bold ${notification.type === 'success' ? 'text-emerald-600 hover:text-emerald-800' : 'text-red-600 hover:text-red-800'} transition-colors`}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// app/goals/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type Goal = {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  category: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  createdAt: string;
};

const GOALS_STORAGE_KEY = 'personal-goals';

export default function GoalsPage() {
  const [goals, setGoals] = useLocalStorage<Goal[]>(GOALS_STORAGE_KEY, []);
  const [newGoal, setNewGoal] = useState<Omit<Goal, 'id' | 'createdAt' | 'status' | 'progress'>>({
    title: '',
    description: '',
    targetDate: '',
    category: 'personal',
  });
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>('all');

  const filteredGoals = goals.filter(goal => 
    filter === 'all' ? true : goal.status === filter
  );

  const handleCreateGoal = () => {
    if (!newGoal.title.trim()) return;

    const goal: Goal = {
      id: Date.now().toString(),
      ...newGoal,
      progress: 0,
      status: 'not-started',
      createdAt: new Date().toISOString(),
    };

    setGoals([...goals, goal]);
    setNewGoal({
      title: '',
      description: '',
      targetDate: '',
      category: 'personal',
    });
  };

  const handleUpdateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(goals.map(goal => 
      goal.id === id ? { ...goal, ...updates } : goal
    ));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };

  const handleProgressChange = (id: string, progress: number) => {
    const status = 
      progress === 0 ? 'not-started' :
      progress >= 100 ? 'completed' : 'in-progress';
    
    handleUpdateGoal(id, { progress, status });
  };

  const startEditing = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setNewGoal({
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate,
      category: goal.category,
    });
  };

  const saveEdit = () => {
    if (!editingGoalId || !newGoal.title.trim()) return;

    handleUpdateGoal(editingGoalId, {
      title: newGoal.title,
      description: newGoal.description,
      targetDate: newGoal.targetDate,
      category: newGoal.category,
    });

    setEditingGoalId(null);
    setNewGoal({
      title: '',
      description: '',
      targetDate: '',
      category: 'personal',
    });
  };

  const cancelEdit = () => {
    setEditingGoalId(null);
    setNewGoal({
      title: '',
      description: '',
      targetDate: '',
      category: 'personal',
    });
  };

  // New progress increment function
  const incrementProgress = (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    let newProgress = goal.progress + amount;
    newProgress = Math.max(0, Math.min(100, newProgress)); // Clamp between 0-100
    
    handleProgressChange(id, newProgress);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Goals</h1>
        
        {/* Goal Creation/Editing Form */}
        <div className="rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingGoalId ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title*</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="What do you want to achieve?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="Add details about your goal..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Date</label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                  className="w-full bg-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <option value="personal">Personal</option>
                  <option value="health">Health & Fitness</option>
                  <option value="career">Career</option>
                  <option value="education">Education</option>
                  <option value="financial">Financial</option>
                  <option value="relationships">Relationships</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              {editingGoalId && (
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={editingGoalId ? saveEdit : handleCreateGoal}
                disabled={!newGoal.title.trim()}
                className={`px-4 py-2 rounded-md ${newGoal.title.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'}`}
              >
                {editingGoalId ? 'Save Changes' : 'Add Goal'}
              </button>
            </div>
          </div>
        </div>

        {/* Goals Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
          >
            All ({goals.length})
          </button>
          <button
            onClick={() => setFilter('not-started')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'not-started' ? 'bg-gray-100 text-gray-800' : 'bg-gray-50 text-gray-600'}`}
          >
            Not Started ({goals.filter(g => g.status === 'not-started').length})
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 text-gray-600'}`}
          >
            In Progress ({goals.filter(g => g.status === 'in-progress').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-full text-sm ${filter === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-50 text-gray-600'}`}
          >
            Completed ({goals.filter(g => g.status === 'completed').length})
          </button>
        </div>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <div className="rounded-lg border border-white shadow p-8 text-center">
            <p className="">No goals found. Create your first goal to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map(goal => (
              <div key={goal.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{goal.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {goal.category} • Target: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                      goal.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {goal.status.replace('-', ' ')}
                    </span>
                  </div>
                  
                  {goal.description && (
                    <p className="mt-3 text-gray-600">{goal.description}</p>
                  )}
                  
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-medium">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          goal.progress < 30 ? 'bg-red-500' :
                          goal.progress < 70 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                    
                    {/* New Progress Controls */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => incrementProgress(goal.id, -25)}
                        disabled={goal.progress <= 0}
                        className={`px-3 py-1 text-sm rounded-md ${
                          goal.progress <= 0 ? 
                          'bg-gray-200 text-gray-500 cursor-not-allowed' : 
                          'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        -25%
                      </button>
                      <button
                        onClick={() => incrementProgress(goal.id, -10)}
                        disabled={goal.progress <= 0}
                        className={`px-3 py-1 text-sm rounded-md ${
                          goal.progress <= 0 ? 
                          'bg-gray-200 text-gray-500 cursor-not-allowed' : 
                          'bg-red-400 text-white hover:bg-red-500'
                        }`}
                      >
                        -10%
                      </button>
                      <button
                        onClick={() => incrementProgress(goal.id, 10)}
                        disabled={goal.progress >= 100}
                        className={`px-3 py-1 text-sm rounded-md ${
                          goal.progress >= 100 ? 
                          'bg-gray-200 text-gray-500 cursor-not-allowed' : 
                          'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        +10%
                      </button>
                      <button
                        onClick={() => incrementProgress(goal.id, 25)}
                        disabled={goal.progress >= 100}
                        className={`px-3 py-1 text-sm rounded-md ${
                          goal.progress >= 100 ? 
                          'bg-gray-200 text-gray-500 cursor-not-allowed' : 
                          'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        +25%
                      </button>
                      <button
                        onClick={() => handleProgressChange(goal.id, 100)}
                        disabled={goal.progress === 100}
                        className={`px-3 py-1 text-sm rounded-md ml-auto ${
                          goal.progress === 100 ? 
                          'bg-green-100 text-green-800 cursor-default' : 
                          'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        Complete Goal
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Created: {new Date(goal.createdAt).toLocaleDateString()}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => startEditing(goal)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
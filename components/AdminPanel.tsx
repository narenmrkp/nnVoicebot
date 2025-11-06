import React, { useState, useEffect, useCallback } from 'react';
import { User, KnowledgeFile, UserChatHistory, ChatSession } from '../types';
import { getUsers, saveUsers, getKnowledgeFiles, addKnowledgeFile, deleteKnowledgeFile, getAllChatHistories, deleteUserChatHistory } from '../services/dbService';
import { TrashIcon } from './icons/TrashIcon';

const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

interface FileStatus {
    name: string;
    status: 'processing' | 'success' | 'error';
    message?: string;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [allChatHistories, setAllChatHistories] = useState<UserChatHistory[]>([]);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<FileStatus[]>([]);
  
  const loadData = useCallback(async () => {
    setUsers(getUsers());
    setAllChatHistories(getAllChatHistories());
    try {
        const files = await getKnowledgeFiles();
        setKnowledgeFiles(files);
    } catch (error) {
        console.error("Failed to load knowledge files:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteUser = (email: string) => {
    if (email === 'admin@example.com') {
      alert("For safety, the default admin account cannot be deleted.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete the user ${email}? This action cannot be undone.`)) {
      const currentUsers = getUsers();
      const updatedUsers = currentUsers.filter(user => user.email !== email);
      saveUsers(updatedUsers);
      loadData(); // Re-load all data to reflect the change
    }
  };
  
  const handleDeleteUserChats = (email: string) => {
    if (window.confirm(`Are you sure you want to delete all chat history for ${email}?`)) {
        deleteUserChatHistory(email);
        loadData();
    }
  }
  
  const handleOpenEditModal = (user: User) => {
      setSelectedUser(user);
      setEditModalOpen(true);
  }
  
  const handleUpdateUser = (updatedUser: User) => {
      const currentUsers = getUsers();
      const userIndex = currentUsers.findIndex(u => u.email === updatedUser.email);
      if (userIndex > -1) {
          currentUsers[userIndex] = updatedUser;
          saveUsers(currentUsers);
          loadData();
      }
      setEditModalOpen(false);
      setSelectedUser(null);
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const initialStatuses: FileStatus[] = files.map(file => ({ name: file.name, status: 'processing' }));
      setUploadStatuses(initialStatuses);
      
      let hasChanged = false;
      for (const file of files) {
          try {
              await addKnowledgeFile(file);
              setUploadStatuses(prev => prev.map(s => s.name === file.name ? { ...s, status: 'success', message: 'Uploaded successfully!' } : s));
              hasChanged = true;
          } catch(e: any) {
              setUploadStatuses(prev => prev.map(s => s.name === file.name ? { ...s, status: 'error', message: e.message } : s));
          }
      }
      if (hasChanged) {
        await loadData();
      }
      setTimeout(() => setUploadStatuses([]), 5000);
    }
  };
  
  const handleDeleteFile = async (fileName: string) => {
      if (window.confirm(`Are you sure you want to delete the file ${fileName}?`)) {
          try {
            await deleteKnowledgeFile(fileName);
            await loadData();
          } catch(error) {
              console.error("Failed to delete file:", error);
              alert("Error: Could not delete the file. Please refresh and try again.");
          }
      }
  };

  return (
    <div className="flex justify-center items-start min-h-screen w-full p-4 md:p-8 pt-24">
      <div className="w-full max-w-7xl p-6 md:p-8 space-y-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800">Admin Dashboard</h2>
        
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Management */}
                <section className="bg-white/50 p-6 rounded-lg shadow-md">
                  <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">User Management</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {users.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="p-2">Email</th>
                                    <th className="p-2">Role</th>
                                    <th className="p-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                            {users.map(user => (
                              <tr key={user.email} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-2 truncate" title={user.email}>{user.email}</td>
                                <td className="p-2 capitalize">{user.isAdmin ? 'Admin' : 'User'}</td>
                                <td className="p-2 flex justify-end items-center gap-2">
                                    <button onClick={() => handleOpenEditModal(user)} className="text-blue-500 hover:text-blue-700 disabled:opacity-50" disabled={user.isSocial} title={user.isSocial ? "Cannot edit social account" : "Edit User"}>
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.email)} className="text-red-500 hover:text-red-700" title="Delete User">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                              </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : <p className="text-gray-500">No registered users.</p>}
                  </div>
                </section>
                
                {/* Knowledge Base Management */}
                <section className="bg-white/50 p-6 rounded-lg shadow-md">
                  <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Knowledge Base</h3>
                  <div className="mb-4">
                    <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Documents (.txt, .pdf)
                    </label>
                    <input
                      id="file-upload" type="file" multiple accept=".txt,.pdf" onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                    />
                  </div>

                   {uploadStatuses.length > 0 && <div className="space-y-2 my-4">
                        {uploadStatuses.map(s => (
                            <div key={s.name} className={`text-sm p-2 rounded-md ${s.status === 'success' ? 'bg-green-100 text-green-800' : s.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                               <strong>{s.name}:</strong> {s.status === 'processing' ? 'Processing...' : s.message}
                            </div>
                        ))}
                    </div>}

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    <h4 className="font-semibold text-gray-600">Uploaded Files:</h4>
                    {knowledgeFiles.length > 0 ? knowledgeFiles.map(file => (
                      <div key={file.name} className="flex justify-between items-center p-2 bg-gray-100 rounded-lg">
                        <span className="text-gray-800 truncate" title={file.name}>{file.name}</span>
                        <button onClick={() => handleDeleteFile(file.name)} className="text-red-500 hover:text-red-700" title="Delete File">
                           <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    )) : <p className="text-gray-500 text-sm">No knowledge files uploaded.</p>}
                  </div>
                </section>
            </div>

            {/* Chat Audit Section */}
            <section className="bg-white/50 p-6 rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">Chat Audit</h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {allChatHistories.length > 0 ? allChatHistories.map(userHistory => (
                        <details key={userHistory.userEmail} className="bg-gray-50 rounded-lg open:shadow-lg">
                            <summary className="p-4 font-semibold cursor-pointer flex justify-between items-center">
                                <span>{userHistory.userEmail} ({userHistory.sessions.length} sessions)</span>
                                <button onClick={(e) => { e.preventDefault(); handleDeleteUserChats(userHistory.userEmail); }} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                                    <TrashIcon className="w-4 h-4" /> Delete All
                                </button>
                            </summary>
                            <div className="p-4 border-t space-y-2">
                                {userHistory.sessions.map(session => (
                                    <details key={session.id} className="bg-white rounded border">
                                        <summary className="p-2 text-sm font-medium cursor-pointer">{session.title} - <span className="text-gray-500">{new Date(session.timestamp).toLocaleString()}</span></summary>
                                        <div className="p-3 border-t text-sm space-y-2 max-h-80 overflow-y-auto">
                                            {session.history.map((entry, index) => (
                                                <div key={index} className={`flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                                                    <div className={`max-w-md p-2 rounded-lg ${entry.speaker === 'user' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                                        <p className="font-bold capitalize">{entry.speaker}</p>
                                                        <p>{entry.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </details>
                    )) : <p className="text-gray-500">No chat histories recorded.</p>}
                </div>
            </section>
        </div>
      </div>
      
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-2xl font-bold mb-4">Edit User: {selectedUser.email}</h3>
                <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(selectedUser); }}>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Role</label>
                        <select
                            value={selectedUser.isAdmin ? 'admin' : 'user'}
                            onChange={(e) => setSelectedUser({ ...selectedUser, isAdmin: e.target.value === 'admin' })}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <button type="button" onClick={() => setEditModalOpen(false)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            Cancel
                        </button>
                        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

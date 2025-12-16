  "use client";

  import React, { createContext, useContext, useEffect, useState } from "react";
  import type { Role } from "@prisma/client";

  interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    role?: Role;
    joinedAt?: string;
  }

  interface UserContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => void;
  }

  const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    refreshUser: () => {},
  });

  export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data);
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
      fetchUser();
    }, []);

    return (
      <UserContext.Provider value={{ user, loading, refreshUser: fetchUser }}>
        {children}
      </UserContext.Provider>
    );
  }

  export function useUser() {
    return useContext(UserContext);
  }

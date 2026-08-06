"use client";

import React from "react";
import MessagesPage from "../../messages/page";
import OwnerHeader from "../../../components/OwnerHeader";

export default function OwnerMessagesPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <OwnerHeader />
      <div className="flex-grow">
        <MessagesPage />
      </div>
    </div>
  );
}

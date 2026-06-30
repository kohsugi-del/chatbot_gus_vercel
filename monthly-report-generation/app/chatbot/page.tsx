"use client"

import { GasChatbot } from "@/components/gas-chatbot/gas-chatbot"

// Mock API function
const mockOnSendMessage = async (message: string, categoryId: string | null): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Category-based responses
  if (categoryId === "home") {
    return "ご家庭向けのガス料金プランについてご案内いたします。\n\n当社では、ご使用量に応じた複数のプランをご用意しております。標準プランの他、床暖房をご利用のお客様向けの「ゆかだんプラン」や、エネファームをご利用のお客様向けの「エネファームプラン」がございます。\n\nご契約内容の確認やプラン変更は、マイページからお手続きいただけます。"
  }
  if (categoryId === "business") {
    return "業務用ガスのご契約についてご案内いたします。\n\n業務用のお客様には、ご使用規模に応じた料金メニューをご提案しております。飲食店様向けの「厨房プラン」、工場・施設向けの「産業用プラン」など、お客様のニーズに合わせたプランをご用意しております。\n\n詳しいお見積りは、担当営業よりご連絡させていただきます。"
  }
  if (categoryId === "start-stop") {
    return "ガスの開栓・閉栓手続きについてご案内いたします。\n\n【開栓（ガスのご使用開始）】\nお引越しの3日前までにWebまたはお電話でお申し込みください。当日は係員がお伺いし、開栓作業と安全点検を行います。\n\n【閉栓（ガスのご使用停止）】\nお引越しの3日前までにお申し込みください。閉栓時は立会い不要です。\n\n手続きはマイページからも可能です。"
  }
  if (categoryId === "equipment") {
    return "ガス機器についてご案内いたします。\n\n当社では、ガスコンロ、給湯器、床暖房、衣類乾燥機など、各種ガス機器の販売・設置・修理を承っております。\n\n機器の調子が悪い場合や、点検をご希望の場合は、訪問修理サービスをご利用ください。\n\nエラーコードが表示されている場合は、機器の型番とエラー番号をお知らせいただくと、より詳しくご案内できます。"
  }
  if (categoryId === "company") {
    return "当社についてご案内いたします。\n\n【会社概要】\n創業以来、地域のお客様に安全で快適なガスライフをお届けしてまいりました。\n\n【採用情報】\n新卒採用・キャリア採用ともに募集しております。詳しくは採用ページをご覧ください。\n\n【IR情報】\n決算情報、株主向け情報は当社Webサイトの投資家情報ページでご確認いただけます。"
  }

  // Keyword-based responses
  if (message.includes("料金") || message.includes("支払い")) {
    return "ガス料金についてご案内いたします。\n\n毎月のガス料金は、基本料金と従量料金の合計で計算されます。お支払い方法は、口座振替、クレジットカード、払込票でのお支払いからお選びいただけます。\n\n料金の詳細やお支払い状況は、マイページでご確認いただけます。"
  }
  if (message.includes("引越し") || message.includes("引っ越し")) {
    return "お引越しに伴うガスの手続きについてご案内いたします。\n\n【ご使用停止（旧居）】\nお引越しの3日前までにお申し込みください。閉栓時は立会い不要です。\n\n【ご使用開始（新居）】\nお引越しの3日前までにお申し込みください。開栓時は係員の訪問と立会いが必要です。\n\nお引越し日が決まりましたら、お早めにお手続きをお願いいたします。"
  }

  // Default response
  return "ご質問ありがとうございます。\n\nお問い合わせの内容について確認いたします。より詳しい情報が必要な場合は、お電話または窓口でもご相談いただけます。\n\n他にご不明な点がございましたら、お気軽にお尋ねください。"
}

const mockOnFeedback = (value: 1 | -1, messageId: string) => {
  console.log("[v0] Feedback received:", { value, messageId })
}

export default function ChatbotDemoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <GasChatbot
        clientName="サンプルガス"
        phoneNumber="0120-123-456"
        emergencyPhone="0120-XXX-XXX"
        businessHours="平日 9:00-17:00"
        onSendMessage={mockOnSendMessage}
        onFeedback={mockOnFeedback}
      />
    </div>
  )
}

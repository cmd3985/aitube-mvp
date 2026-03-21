import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | GenCine',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-3xl mx-auto glass p-8 md:p-12 rounded-2xl">
        <h1 className="text-3xl font-bold mb-8 text-white">개인정보 처리방침 (Privacy Policy)</h1>
        
        <div className="space-y-6 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-neon-blue">1. 수집하는 개인정보의 항목</h2>
            <p>
              GenCine은 서비스 제공을 위해 아래와 같은 개인정보를 수집하고 있습니다.<br/>
              - 구글 소셜 로그인 시: 이메일 주소, 이름, 프로필 사진
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-neon-blue">2. 개인정보의 수집 및 이용 목적</h2>
            <p>
              수집된 개인정보는 사용자 식별, '나만의 보관함' 기록 유지, 서비스 부정 이용 방지 등의 목적으로만 사용되며 다른 목적으로는 사용되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-neon-blue">3. 개인정보의 보유 및 이용 기간</h2>
            <p>
              사용자가 회원 탈퇴를 요청하거나 개인정보 동의를 철회할 경우, 해당 개인정보는 지체 없이 파기됩니다. 단, 관련 법령에 의하여 보존할 필요가 있는 경우에는 일정 기간 보존할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-neon-blue">4. 개인정보의 제3자 제공</h2>
            <p>
              GenCine은 원칙적으로 사용자의 개인정보를 외부에 제공하지 않습니다. 다만, 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-neon-blue">5. 문의처</h2>
            <p>
              개인정보 보호와 관련된 문의사항은 아래 이메일로 연락해 주시기 바랍니다.<br/>
              이메일: mnibsi@gmail.com
            </p>
          </section>
        </div>
        
        <div className="mt-12 pt-6 border-t border-gray-800 text-sm text-gray-500">
          본 개인정보 처리방침은 2024년 11월 1일부터 시행됩니다.
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Privatumo politika — DAR marketingo',
  description: 'MB „DAR marketingo" klientų portalo privatumo politika',
}

export default function PrivacyPage() {
  const updated = '2026-06-28'
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1E181C',
        lineHeight: 1.65,
      }}
    >
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>Privatumo politika</h1>
      <p style={{ color: '#8A6F82', marginBottom: 32 }}>Atnaujinta: {updated}</p>

      <Section title="1. Duomenų valdytojas">
        <p>
          Šią platformą („Portalas") valdo <strong>MB „DAR marketingo"</strong> (toliau —
          „mes", „Agentūra"). Dėl klausimų apie šią politiką ar jūsų duomenis kreipkitės
          el. paštu <a href="mailto:labas@darmarketingo.lt">labas@darmarketingo.lt</a>.
        </p>
      </Section>

      <Section title="2. Kokius duomenis tvarkome">
        <p>Portalas tvarko šiuos duomenis:</p>
        <ul style={listStyle}>
          <li>Paskyros duomenys: vardas, el. pašto adresas, rolė portale.</li>
          <li>
            Turinio duomenys: jūsų sukurtas ar patvirtinimui pateiktas socialinių tinklų
            turinys (tekstas, paveikslėliai), užduotys, tikslai, failai, komentarai.
          </li>
          <li>
            Socialinių tinklų integracijos duomenys: prisijungus prie „Meta" (Facebook,
            Instagram) — jūsų puslapių ir paskyrų identifikatoriai, prieigos žetonai
            (access tokens) ir turinio publikavimo metaduomenys, gauti per oficialų „Meta"
            Graph API.
          </li>
        </ul>
      </Section>

      <Section title="3. Kaip ir kodėl naudojame duomenis">
        <p>Duomenis naudojame tik tam, kad teiktume Portalo funkcijas:</p>
        <ul style={listStyle}>
          <li>Turinio kūrimui, tvirtinimui ir publikavimui į jūsų socialinių tinklų puslapius.</li>
          <li>Užduočių, tikslų, failų ir ataskaitų valdymui.</li>
          <li>Prieigos prie paskyros suteikimui ir saugumui užtikrinti.</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Mes <strong>neparduodame</strong> jūsų duomenų ir nenaudojame jų reklamos
          tikslais. „Meta" gautus duomenis naudojame tik publikavimo funkcijai ir laikomės
          „Meta" platformos taisyklių.
        </p>
      </Section>

      <Section title="4. Duomenų saugojimas">
        <p>
          Duomenys saugomi „Supabase" (duomenų bazė ir failų saugykla) bei talpinami per
          „Vercel" infrastruktūrą. Prieigos žetonai saugomi saugiai ir naudojami tik
          serverio pusėje publikavimo užklausoms. Duomenis saugome tol, kol galioja jūsų
          paskyra arba kol to reikia paslaugai teikti.
        </p>
      </Section>

      <Section title="5. Duomenų perdavimas tretiesiems asmenims">
        <p>
          Duomenis perduodame tik paslaugų teikėjams, būtiniems Portalo veikimui
          („Supabase", „Vercel", „Meta" socialinių tinklų API), ir tik tiek, kiek reikia
          paslaugai suteikti. Su šiais teikėjais duomenys tvarkomi pagal jų privatumo
          sąlygas.
        </p>
      </Section>

      <Section title="6. Jūsų teisės">
        <p>
          Pagal BDAR (GDPR) turite teisę susipažinti su savo duomenimis, juos ištaisyti,
          ištrinti, apriboti tvarkymą ar perkelti. Bet kuriuo metu galite atšaukti
          socialinių tinklų prieigą atjungdami paskyrą Portalo nustatymuose arba „Meta"
          paskyros nustatymuose. Norėdami pasinaudoti teisėmis, rašykite{' '}
          <a href="mailto:labas@darmarketingo.lt">labas@darmarketingo.lt</a>.
        </p>
      </Section>

      <Section title="7. Duomenų ištrynimas">
        <p>
          Norėdami ištrinti savo duomenis, parašykite mums el. paštu{' '}
          <a href="mailto:labas@darmarketingo.lt">labas@darmarketingo.lt</a> — duomenis ir
          susietus „Meta" prieigos žetonus pašalinsime per pagrįstą terminą.
        </p>
      </Section>

      <Section title="8. Politikos pakeitimai">
        <p>
          Šią politiką galime atnaujinti. Apie esminius pakeitimus informuosime per
          Portalą. Aktuali versija visada skelbiama šiame puslapyje.
        </p>
      </Section>

      <p style={{ marginTop: 40, color: '#8A6F82', fontSize: 13 }}>
        © {new Date().getFullYear()} MB „DAR marketingo". Visos teisės saugomos.
      </p>
    </main>
  )
}

const listStyle: React.CSSProperties = {
  margin: '8px 0 0',
  paddingLeft: 22,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  )
}

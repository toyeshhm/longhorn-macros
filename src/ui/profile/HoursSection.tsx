import { dayNames, dayText, type Week } from '../../menu/hours'
import { HALLS } from '../../menu/select'
import { Banner } from '../components/Banner'
import { useHours } from '../hooks'
import { useT } from '../i18n'

// The hall's name is UT's own and stays as UT writes it; the days and the windows are the app's words.
function HallWeek({ name, week }: { name: string; week: Week }) {
  const t = useT()
  return (
    <table class="hours-table">
      <caption>{name}</caption>
      <tbody>
        {dayNames(t).map((day, i) => (
          <tr key={day}>
            <th scope="row">{day}</th>
            <td>{dayText(week[i] ?? null, t)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HoursSection() {
  const t = useT()
  const { hours, stale, error } = useHours()
  return (
    <>
      {stale && <Banner tone="info">{t.t('hours.stale')}</Banner>}
      {hours === null ? (
        <p class="muted">{t.t(error === null ? 'hours.loading' : 'hours.loadFailed')}</p>
      ) : (
        HALLS.map((h) => <HallWeek key={h.id} name={h.full} week={hours[h.id]} />)
      )}
      <p class="muted">{t.t('hours.published')}</p>
    </>
  )
}

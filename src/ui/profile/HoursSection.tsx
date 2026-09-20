import { DAY_NAMES, dayText, type Week } from '../../menu/hours'
import { HALLS } from '../../menu/select'
import { Banner } from '../components/Banner'
import { useHours } from '../hooks'

function HallWeek({ name, week }: { name: string; week: Week }) {
  return (
    <table class="hours-table">
      <caption>{name}</caption>
      <tbody>
        {DAY_NAMES.map((day, i) => (
          <tr key={day}>
            <th scope="row">{day}</th>
            <td>{dayText(week[i] ?? null)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HoursSection() {
  const { hours, stale, error } = useHours()
  return (
    <>
      {stale && <Banner tone="info">Showing the hours saved earlier. Couldn't reach UT dining.</Banner>}
      {hours === null ? (
        <p class="muted">{error === null ? 'Loading hours…' : "Couldn't load UT dining hours."}</p>
      ) : (
        HALLS.map((h) => <HallWeek key={h.id} name={h.full} week={hours[h.id]} />)
      )}
      <p class="muted">Published by UT Dining. Holidays and closures can move these.</p>
    </>
  )
}

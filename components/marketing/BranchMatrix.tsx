import { StatusPlate } from "@/components/ui/StatusPlate";
import { describeHours, isOpenNow } from "@/lib/business-hours";
import type { Branch } from "@/lib/site-config";
import { whatsappHref } from "@/lib/site-config";

const LINK_CLASS = "inline-flex min-h-[44px] items-center text-zinc-100 underline decoration-hawk-crimson underline-offset-4";

export function BranchMatrix({ branches, now }: { branches: readonly Branch[]; now: Date }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-700 text-sm text-zinc-300">
            <th scope="col" className="py-3 pr-4 font-medium">Branch</th>
            <th scope="col" className="py-3 pr-4 font-medium">Region</th>
            <th scope="col" className="py-3 pr-4 font-medium">Hours</th>
            <th scope="col" className="py-3 pr-4 font-medium">Status</th>
            <th scope="col" className="py-3 font-medium">Reach us</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hawk-obsidian-border">
          {branches.map((branch) => {
            const whatsapp = whatsappHref(branch.whatsappE164);
            const open = isOpenNow(branch.hours, now);
            return (
              <tr key={branch.name} className="align-top">
                <th scope="row" className="py-5 pr-4 font-semibold text-zinc-50">
                  {branch.name}
                  {branch.serviceRadiusKm !== null ? (
                    <span className="mt-1 block text-sm font-normal text-zinc-400">
                      Travels up to <span className="font-mono tabular-nums">{branch.serviceRadiusKm}</span> km
                    </span>
                  ) : null}
                </th>
                <td className="py-5 pr-4 text-zinc-300">{branch.region}</td>
                <td className="py-5 pr-4 text-zinc-300">{describeHours(branch.hours)}</td>
                <td className="py-5 pr-4">
                  <StatusPlate tone={open ? "open" : "closed"} label={open ? "Open now" : "Closed"} />
                </td>
                <td className="py-5">
                  <div className="flex flex-wrap gap-x-5">
                    {branch.phoneE164 ? (
                      <a href={`tel:${branch.phoneE164}`} className={`${LINK_CLASS} font-mono`}>
                        {branch.phoneDisplay ?? branch.phoneE164}
                      </a>
                    ) : null}
                    {whatsapp ? (
                      <a href={whatsapp} rel="noopener noreferrer" target="_blank" className={LINK_CLASS}>
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

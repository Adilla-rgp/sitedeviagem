import { CircleDashed, UserCog } from "lucide-react"
import { Button } from "../../../components/button"

export function Guests() {
    return (
        <div className="space-y-6">
            <h2 className="font-semibold text-xl">Convidados</h2>
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                        <span className="block font-medium text-zin-100">Jessica white</span>
                        <span className="block text-xm text-zinc-400 truncate">
                            jessica.white@gmail.com
                        </span>
                    </div>
                    <CircleDashed className="text-zinc-400 size-5" />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                        <span className="block font-medium text-zin-100">Rita pereira</span>
                        <span className="block text-xm text-zinc-400 truncate">
                            Rita.pereira@gmail.com
                        </span>
                    </div>
                    <CircleDashed className="text-zinc-400 size-5" />
                </div>
            </div>
            <Button variant="secondary" size='full'>
                <UserCog className='size-5' />
                Gerenciar convidados
            </Button>
        </div>
    )
}
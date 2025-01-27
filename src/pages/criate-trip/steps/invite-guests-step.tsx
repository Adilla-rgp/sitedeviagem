import { ArrowRight, UserRoundPlus } from "lucide-react";
import { Button } from "../../../components/button";

interface InviteGuestsStep{
    abrirGuestsModal: () => void
    emailsToInvite: string[]
    openConfirmTripModal: () => void
}
export function InviteGuestsStep({
    emailsToInvite, 
    abrirGuestsModal,
    openConfirmTripModal,
}:InviteGuestsStep) {
    return (
        <div className="h-16 bg-zinc-900 px-4 rounded-xl flex items-center shadow-shape gap-3">
            <button type='button' onClick={abrirGuestsModal} className='flex items-center gap-2 flex-1'>
                <UserRoundPlus className='size-5 text-zinc-400' />
                {emailsToInvite.length > 0 ? (
                    <span className='text-zinc-100 text-lg flex-1'>
                        {emailsToInvite.length} pessoa(s) convidada(s) </span>
                ) : (
                    <span className='text-zinc-400 text-lg flex-1'>
                        Quem estará na viagem?
                    </span>
                )}

            </button>

            <div className='w-px h-6 bg-zinc-400' />

            <Button onClick={openConfirmTripModal} variant="primary" size="default" >
                confirmar viagem
                <ArrowRight className='size-5' />
            </Button>
        </div>
    )
}
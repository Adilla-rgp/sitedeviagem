import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InviteGuestModal } from './invite-guest-modal'
import { ConfirmTripModal } from './confirm-trip-modal'
import { DestinationAndDateStep } from './steps/destination-and-date-step'
import { InviteGuestsStep } from './steps/invite-guests-step'

export function CreatTripPage() {

    const navigate = useNavigate()
    const [isGuestInputOpen, setIsGuestInpuOpen] = useState(false)
    const [isGuestModalOpen, setIsGuestsModalOpen] = useState(false)
    const [isConfirmTripModalOpen, setConfirmTripModalOpen] = useState(false)
    const [emailsToInvite, setEmailsToEnvite] = useState<string[]>([
    ])


    function openGuestInput() {
        setIsGuestInpuOpen(true)
    }

    function closeGuestsInput() {
        setIsGuestInpuOpen(false)
    }

    function abrirGuestsModal() {
        setIsGuestsModalOpen(true)
    }

    function closeGuestsModal() {
        setIsGuestsModalOpen(false)
    }

    function openConfirmTripModal() {
        setConfirmTripModalOpen(true)
    }

    function closeConfirmTripModal() {
        setConfirmTripModalOpen(false)
    }

    function addNewEmailToInvite(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const data = new FormData(event.currentTarget)
        const email = data.get('email')?.toString()

        if (!email) {
            return
        }

        if (emailsToInvite.includes(email)) {
            return
        }

        setEmailsToEnvite([...emailsToInvite, email])

        event.currentTarget.reset()

    }

    function removeEmail(emailsToRemove: String) {
        setEmailsToEnvite(emailsToInvite.filter(email => email !== emailsToRemove))
    }

    function createTrip(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        navigate('/trips/123')

    }

    return (
        <div className="h-screen  flex items-center justify-center">
            <div className="max-w-3xl w-full px-6 text-center space-y-10">
                <div className='flex flex-col items-center gap-3'>
                    <img src="/logo.svg" alt="plann.er" />
                    <p>Convide seus amigos e planeje sua próxima viagem</p>
                </div>

                <div className='space-y-4' >
                    <DestinationAndDateStep
                        closeGuestsInput={closeGuestsInput}
                        isGuestInputOpen={isGuestInputOpen}
                        openGuestInput={openGuestInput}
                    />


                    {isGuestInputOpen && (
                        <InviteGuestsStep
                            emailsToInvite={emailsToInvite}
                            abrirGuestsModal={abrirGuestsModal}
                            openConfirmTripModal={openConfirmTripModal}
                        />
                    )
                    }

                </div>

                <p className="text-small text-zinc-500">
                    Ao planejar sua viagem pela plann.er você automaticamente concorda <br /> com
                    nossos <a className="text-zinc-300 underline" href="#"> termos de uso</a> e <a className="text-zinc-300" href="#">políticas de privacidade</a>
                </p>
            </div>

            {isGuestModalOpen && (
                <InviteGuestModal
                    emailsToInvite={emailsToInvite}
                    addNewEmailToInvite={addNewEmailToInvite}
                    closeGuestsModal={closeGuestsModal}
                    removeEmail={removeEmail}
                />
            )}

            {isConfirmTripModalOpen && (
                <ConfirmTripModal
                    closeConfirmTripModal={closeConfirmTripModal}
                    createTrip={createTrip}
                />
            )}

        </div>
    )
}
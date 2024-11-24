'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChatRequestOptions, CreateMessage, Message } from 'ai'
import { Dispatch, SetStateAction, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'



const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    doctor_type: z.string().min(1, 'Doctor type is required'),
    lang: z.string().min(1, 'Language is required'),
    confirm_additional_data: z.string(),
    cancel_additional_data: z.string(),
})

type Props = {
    append: (
        message: Message | CreateMessage,
        chatRequestOptions?: ChatRequestOptions
    ) => Promise<string | null | undefined>;
    setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void;
    setDialogId: Dispatch<SetStateAction<string | null>>
}

export default function ChatForm({ append, setMessages, setDialogId }: Props) {
    const [isLoading, setIsLoading] = useState(false)
    const [systemMessage, setSystemMessage] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            date: '',
            time: '',
            doctor_type: '',
            lang: 'en',
            confirm_additional_data: '',
            cancel_additional_data: '',
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setIsLoading(true)

            const formData = new FormData()
            Object.entries(values).forEach(([key, value]) => {
                formData.append(key, value)
            })

            const dialogResponse = await fetch('http://127.0.0.1:5000/v2/new_dialog', {
                method: 'POST',
                body: formData,
            })

            if (!dialogResponse.ok) {
                throw new Error('Failed to create dialog')
            }

            const dialog_id = await dialogResponse.text()

            setDialogId(dialog_id)

            setMessages(messages => [...messages, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `Hello, I'm calling to confirm your appointment with the therapist`,
            }])



        } catch (error) {
            console.error('Error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-lg p-6 backdrop-blur-md bg-black/50 rounded-lg shadow-lg">
                <h2 className="text-white text-2xl font-bold text-center mb-4">Chat Form</h2>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Patient Name</FormLabel>
                                    <FormControl>
                                        <Input className="bg-transparent border border-white/50 text-white placeholder:text-white/50" placeholder="Enter patient name" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-white" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Date</FormLabel>
                                    <FormControl>
                                        <Input className="bg-transparent border border-white/50 text-white placeholder:text-white/50" type="date" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-white" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="time"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Time</FormLabel>
                                    <FormControl>
                                        <Input className="bg-transparent border border-white/50 text-white placeholder:text-white/50" type="time" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-white" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="doctor_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Doctor Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-transparent border border-white/50 text-white">
                                                <SelectValue placeholder="Select doctor type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-black/80">
                                            <SelectItem value="pediatrician">Pediatrician</SelectItem>
                                            <SelectItem value="surgeon">Surgeon</SelectItem>
                                            <SelectItem value="therapist">Therapist</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-white" />
                                </FormItem>
                            )}
                        />

                        {/* <FormField
                            control={form.control}
                            name="lang"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Language</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-transparent border border-white/50 text-white">
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-black/80">
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                            <SelectItem value="fr">French</SelectItem>
                                            <SelectItem value="de">German</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-white" />
                                </FormItem>
                            )}
                        /> */}

                        <FormField
                            control={form.control}
                            name="confirm_additional_data"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Confirmation Additional Data</FormLabel>
                                    <FormControl>
                                        <Input className="bg-transparent border border-white/50 text-white placeholder:text-white/50" placeholder="Enter additional data" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-white" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="cancel_additional_data"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Cancellation Additional Data</FormLabel>
                                    <FormControl>
                                        <Input className="bg-transparent border border-white/50 text-white placeholder:text-white/50" placeholder="Enter additional data" {...field} />
                                    </FormControl>
                                    <FormMessage className="text-white" />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-gray-200">
                            {isLoading ? 'Starting Chat...' : 'Start Chat'}
                        </Button>
                    </form>
                </Form>

                {systemMessage && (
                    <div className="mt-4 p-4 bg-black/20 rounded-lg">
                        <p className="text-white">{systemMessage}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
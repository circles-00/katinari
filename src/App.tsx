import {
	FieldValues,
	FormProvider,
	Path,
	useController,
	useForm,
	useFormContext,
} from 'react-hook-form'
import './styles.css'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	LockOutlined as LockIcon,
	LockOpenOutlined as LockOpenIcon,
} from '@mui/icons-material'
import { ChangeEvent, FC, useCallback, useEffect, useMemo } from 'react'
import {
	Button,
	IconButton,
	TextField,
	Typography,
	type TextFieldProps,
} from '@mui/material'

interface IFormInput<T> extends Omit<TextFieldProps, 'name'> {
	name: Path<T>
}

const FormInput = <T extends FieldValues>({
	name,
	...props
}: IFormInput<T>) => {
	const { control } = useFormContext()
	const { field } = useController({ control, name })

	return <TextField {...field} {...props} variant="filled" />
}

const value = z.object({
	value: z.number(),
	percentile: z.number(),
	isLocked: z.boolean(),
})

type TValue = z.infer<typeof value>

const validationSchema = z.object({
	maximumCalories: z.number(),
	protein: value,
	carbs: value,
	fat: value,
})

type TValidationSchema = z.infer<typeof validationSchema>

interface INutritionInput {
	formRootName: string
	title: string
	unlockedFormValues: (TValue & { name: string })[]
}

const INCREMENT_VALUE = 1

const NutritionInput: FC<INutritionInput> = ({
	formRootName,
	title,
	unlockedFormValues,
}) => {
	const { watch, setValue } = useFormContext()
	const formData = watch()
	const isLocked = formData?.[formRootName]?.isLocked

	const filteredUnlockedFormValues = useMemo(
		() => unlockedFormValues.filter(({ name }) => name !== formRootName),
		[unlockedFormValues],
	)

	const currentPercentileValue = formData?.[formRootName]?.percentile
	const value = formData?.[formRootName]?.value
	const maximumCalories = formData?.maximumCalories

	const calculate = (operation: string, a: number, b: number) => {
		switch (operation) {
			case '+':
				return a + b
			case '-':
				return a - b
		}
	}

	const onChange = useCallback(
		(newValue: string) => {
			const parsedValue = Number.parseInt(newValue)
			const difference = Math.abs(parsedValue - currentPercentileValue)

			const half =
				difference /
				(filteredUnlockedFormValues.length === 0
					? 1
					: filteredUnlockedFormValues.length)

			const operation = parsedValue > currentPercentileValue ? '-' : '+'

			filteredUnlockedFormValues.forEach(({ name, percentile }) => {
				const newPercentile = calculate(operation, percentile, half) ?? 0

				setValue(`${name}.percentile`, newPercentile)
				setValue(`${name}.value`, maximumCalories * (newPercentile / 100))
			})

			setValue(`${formRootName}.percentile`, parsedValue)
			setValue(`${formRootName}.value`, maximumCalories * (parsedValue / 100))
		},
		[
			setValue,
			formRootName,
			currentPercentileValue,
			filteredUnlockedFormValues,
		],
	)

	const onIncrement = useCallback(
		() => onChange(`${currentPercentileValue + INCREMENT_VALUE}`),
		[onChange, currentPercentileValue],
	)

	const onDecrement = useCallback(
		() => onChange(`${currentPercentileValue - INCREMENT_VALUE}`),
		[onChange, currentPercentileValue],
	)

	const onToggleLock = useCallback(() => {
		setValue(`${formRootName}.isLocked`, !isLocked)
	}, [formRootName, isLocked, setValue])

	const isButtonDisabled = useMemo(
		() =>
			unlockedFormValues.length < 2 ||
			!unlockedFormValues.some(({ name }) => name === formRootName),
		[unlockedFormValues],
	)

	return (
		<div>
			<div className="container">
				<h3>{title}</h3>
				<IconButton onClick={onToggleLock}>
					{isLocked ? (
						<LockIcon style={{ color: 'black' }} />
					) : (
						<LockOpenIcon style={{ color: 'black' }} />
					)}
				</IconButton>
			</div>
			<div className="container">
				<div className="inputContainer">
					<Button
						variant="contained"
						disabled={isButtonDisabled}
						onClick={onIncrement}
					>
						+
					</Button>
					<Button
						variant="contained"
						disabled={isButtonDisabled}
						onClick={onDecrement}
					>
						-
					</Button>
				</div>
				<div className="inputContainer">
					<FormInput
						onChange={({ target: { value } }) => onChange(value)}
						name={`${formRootName}.percentile`}
					/>
					<FormInput disabled name={`${formRootName}.value`} />
				</div>
			</div>
		</div>
	)
}

export default function App() {
	// Note: This will be coming from backend, now this is just for demo
	const macroSplitTemplate = useMemo(
		() => ({
			protein: 30,
			carbs: 40,
			fat: 30,
		}),
		[],
	)

	const methods = useForm<TValidationSchema>({
		resolver: zodResolver(validationSchema),
		defaultValues: {
			maximumCalories: 2000,
			protein: {
				isLocked: true,
				percentile: macroSplitTemplate.protein,
			},
			carbs: {
				isLocked: true,
				percentile: macroSplitTemplate.carbs,
			},
			fat: {
				isLocked: true,
				percentile: macroSplitTemplate.fat,
			},
		},
	})

	const formData = methods.watch()
	const maximumCalories = formData?.maximumCalories

	const unlockedFormValues = useMemo(
		() =>
			[
				{ ...formData?.protein, name: 'protein' },
				{ ...formData?.carbs, name: 'carbs' },
				{ ...formData?.fat, name: 'fat' },
			].filter((value) => !value?.isLocked),
		[formData],
	)

	// Initialize the form with the macro split template
	useEffect(() => {
		methods.setValue(
			'protein.value',
			maximumCalories * (formData?.protein?.percentile / 100),
		)

		methods.setValue(
			'carbs.value',
			maximumCalories * (formData?.carbs?.percentile / 100),
		)

		methods.setValue(
			'fat.value',
			maximumCalories * (formData?.fat?.percentile / 100),
		)

		methods.setValue('protein.percentile', macroSplitTemplate.protein)
		methods.setValue('carbs.percentile', macroSplitTemplate.carbs)
		methods.setValue('fat.percentile', macroSplitTemplate.fat)
	}, [maximumCalories, methods.setValue, macroSplitTemplate])

	return (
		<FormProvider {...methods}>
			<div className="container">
				<FormInput name="maximumCalories" label="Maximum Calories" />
				<NutritionInput
					formRootName="protein"
					title="Protein"
					unlockedFormValues={unlockedFormValues}
				/>
				<NutritionInput
					formRootName="carbs"
					title="Carbs"
					unlockedFormValues={unlockedFormValues}
				/>
				<NutritionInput
					formRootName="fat"
					title="Fat"
					unlockedFormValues={unlockedFormValues}
				/>
			</div>
			{unlockedFormValues.length < 2 && (
				<Typography variant="subtitle1" style={{ color: 'red' }}>
					Please unlock 2 or more inputs to continue
				</Typography>
			)}
		</FormProvider>
	)
}

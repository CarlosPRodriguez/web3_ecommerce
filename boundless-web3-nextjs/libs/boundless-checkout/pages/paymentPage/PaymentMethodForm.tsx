import React from "react";
import Typography from "@mui/material/Typography";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import Button from "@mui/material/Button";
import PaymentIcon from "@mui/icons-material/Payment";
import Box from "@mui/material/Box";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { apiErrors2Formik } from "../../lib/formUtils";
import { addPromise } from "../../redux/actions/xhr";
import ExtraErrors from "../../components/ExtraErrors";
import {
	ICheckoutPaymentPageData,
	TCheckoutStep,
	TPaymentGatewayAlias,
	IPaymentMethod,
} from "boundless-api-client";
import { useTranslation } from "react-i18next";
import { ethers } from "ethers";
import { abi } from "../../../../constants/abi";

export default function PaymentMethodForm({
	paymentPage,
}: {
	paymentPage: ICheckoutPaymentPageData;
}) {
	const { onSubmit } = useSavePaymentMethod();
	const { t } = useTranslation();

	return (
		<Formik initialValues={getFormInitialValues()} onSubmit={onSubmit}>
			{(formikProps) => (
				<Form className={"bdl-payment-form"}>
					{Object.keys(formikProps.errors).length > 0 && (
						<ExtraErrors
							excludedFields={["payment_method_id"]}
							errors={formikProps.errors}
						/>
					)}
					<Typography variant="h5" mb={2}>
						{t("paymentMethodForm.pageHeader")}
					</Typography>
					<PaymentMethods
						formikProps={formikProps}
						paymentMethods={paymentPage.paymentMethods}
					/>
					<Box textAlign={"end"}>
						<Button
							variant="contained"
							startIcon={<PaymentIcon />}
							type={"submit"}
							disabled={formikProps.isSubmitting}
						>
							<PayBtnTitle
								paymentMethods={paymentPage.paymentMethods}
								paymentMethodId={formikProps.values.payment_method_id}
							/>
						</Button>
					</Box>
				</Form>
			)}
		</Formik>
	);
}

const getFormInitialValues = () => {
	const initialValues: IPaymentMethodFormValues = { payment_method_id: -1 };

	return initialValues;
};

const PaymentMethods = ({
	formikProps,
	paymentMethods,
}: {
	formikProps: FormikProps<IPaymentMethodFormValues>;
	paymentMethods: IPaymentMethod[];
}) => {
	const { t } = useTranslation();

	return (
		<Box mb={2}>
			<FormControl
				variant="standard"
				error={Boolean("payment_method_id" in formikProps.errors)}
			>
				<RadioGroup
					name="payment_method_id"
					onChange={formikProps.handleChange}
				>
					{/* {paymentMethods.map(({ payment_method_id, title, gateway_alias }) => {
						switch (gateway_alias) {
							case TPaymentGatewayAlias.paypal:
								return (
									<React.Fragment key={payment_method_id}>
										<FormControlLabel
											value={payment_method_id}
											control={<Radio required={true} />}
											label={
												<span className={"payment-method__label"}>
													<span
														className={
															"payment-method__icon payment-method__icon-paypal"
														}
													/>
													{title}
												</span>
											}
										/>
										{formikProps.values.payment_method_id ==
											payment_method_id && (
											<Typography className={"text-muted"} mb={1}>
												{t("paymentMethodForm.payPalHint")}
											</Typography>
										)}
									</React.Fragment>
								);
							default:
								return (
									<FormControlLabel
										value={payment_method_id}
										control={<Radio required={true} />}
										label={title}
										key={payment_method_id}
									/>
								);
						}
					})} */}
					<FormControlLabel
						value={0}
						control={<Radio required={true} />}
						label={"Pay with Cryptcurrency"}
						key={"crypto"}
					/>
				</RadioGroup>
				{"payment_method_id" in formikProps.errors && (
					<FormHelperText>
						{formikProps.errors.payment_method_id}
					</FormHelperText>
				)}
			</FormControl>
		</Box>
	);
};

const useSavePaymentMethod = () => {
	const { api, order, onThankYouPage } = useAppSelector((state) => state.app);
	const dispatch = useAppDispatch();

	const onSubmit = async (
		values: IPaymentMethodFormValues,
		{ setSubmitting, setErrors }: FormikHelpers<IPaymentMethodFormValues>
	) => {
		if (!order || !api) return;

		const response: any = await fetch(
			"https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd"
		);
		const crypto_price = await response.json();
		const matic_price = crypto_price["matic-network"]["usd"];
		console.log(order, "order");
		if (
			values.payment_method_id == 0 &&
			typeof window.ethereum !== "undefined"
		) {
			await window.ethereum.request({ method: "eth_requestAccounts" });
			const provider = new ethers.providers.Web3Provider(window.ethereum);
			const contractAddress = process.env.PUBLIC_CONTRACT as string;
			const contract = new ethers.Contract(
				contractAddress,
				abi,
				provider.getSigner(0)
			);
			const matic_amount =
				parseFloat(order.total_price as string) / matic_price;
			try {
				const tx = await contract.pay(order.id, {
					value: ethers.utils.parseEther(matic_amount.toString()), //ethers.utils.parseEther("0.0001")
				});
				await tx.wait();
			} catch (error) {
				console.log(error);
			}
		}
		try {
			const { redirectTo, url, error } = await api.checkout.setPaymentMethod({
				order_id: order.id,
				payment_method_id: 1,
			});

			if (redirectTo === "url" && url) {
				window.location.href = url;
			} else if (redirectTo === TCheckoutStep.thankYou) {
				onThankYouPage?.({ orderId: order.id, error });
			} else {
				console.error("Unknown redirect:", redirectTo);
			}
		} catch (error: any) {
			if (error.response && error.response.data) {
				setErrors(apiErrors2Formik(error.response.data));
			} else {
				console.error("An error occurred:", error);
			}
		} finally {
			setSubmitting(false);
		}
	};

	return {
		onSubmit,
	};
};

export interface IPaymentMethodFormValues {
	payment_method_id: number;
}

const PayBtnTitle = ({
	paymentMethods,
	paymentMethodId,
}: {
	paymentMethods: IPaymentMethod[];
	paymentMethodId: number;
}) => {
	const paymentMethod = paymentMethods.find(
		({ payment_method_id }) => payment_method_id == paymentMethodId
	);
	const { t } = useTranslation();

	if (paymentMethod) {
		switch (paymentMethod.gateway_alias) {
			case TPaymentGatewayAlias.paypal:
				return <>{t("paymentMethodForm.payNow")}</>;
		}
	}

	return <>{t("paymentMethodForm.completeOrder")}</>;
};

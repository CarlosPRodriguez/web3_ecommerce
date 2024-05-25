import { MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import HeaderCart from "./cart/HeaderCart";
import ChooseVariantModal from "./header/ChooseVariantModal";
// import {faBars} from '@fortawesome/free-solid-svg-icons/faBars';
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { setIsOpened } from "../redux/reducers/asideMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhoneAlt } from "@fortawesome/free-solid-svg-icons/faPhoneAlt";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons/faWhatsapp";
import { RootState } from "../redux/store";
import clsx from "clsx";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";
import { connect, disconnect } from "../redux/reducers/wallet";

let web3Modal: any;

const providerOptions = {
	walletconnect: {
		package: WalletConnectProvider, // required
		options: {
			rpc: { [process.env.PUBLIC_CHAIN as string]: process.env.PUBLIC_RPC_URL }, // required
			network: "matic",
		},
	},
};

export default function Header() {
	const dispatch = useAppDispatch();
	const wallet = useAppSelector((state) => state.wallet.value);
	const asideIsOpened = useAppSelector(
		(state: RootState) => state.asideMenu.isOpened
	);
	const onHamburgerBtnClicked = (e: MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		dispatch(setIsOpened(true));
	};

	// const wallet = useSelector((state) => state.wallet.value);

	const [address, setAddress] = useState<string>();

	useEffect(() => {
		web3Modal = new Web3Modal({
			cacheProvider: true,
			providerOptions, // required
		});
	}, []);

	useEffect(() => {
		if (window.ethereum) {
			const provider = new ethers.providers.Web3Provider(
				window.ethereum,
				"any"
			);
			provider.on("network", async (newNetwork, oldNetwork) => {
				const provider = new ethers.providers.Web3Provider(window.ethereum);
				dispatch(connect({ chainId: newNetwork.chainId }));
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const checkIfWalletIsConnected = async () => {
		try {
			const { ethereum } = window;

			const accounts = await ethereum.request({ method: "eth_accounts" });
			if (accounts.length) {
				const account = accounts[0];
				console.log("Found an authorized account ", account);
				setAddress(account);
				detailsOn();
			} else {
				await Disconnect();
				console.log("Could not find an authorized account");
			}
		} catch (error) {
			console.log(error);
		}
	};

	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Use Metamask!");
			} else {
				const accounts = await ethereum.request({
					method: "eth_requestAccounts",
				});
				console.log("Account connected ", accounts[0]);

				setAddress(accounts[0]);
			}
		} catch (error) {
			console.log(error);
		}
	};

	const detailsOn = async () => {
		const { ethereum } = window;
		const provider = new ethers.providers.Web3Provider(ethereum);
		const signer = provider.getSigner();

		const addr = await signer.getAddress();

		setAddress(addr.toString());
	};

	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);

	async function Connect() {
		try {
			if (typeof window.ethereum !== "undefined") {
				const web3ModalProvider = await web3Modal.connect();
				const provider = new ethers.providers.Web3Provider(web3ModalProvider);
				const { chainId } = await provider.getNetwork();
				dispatch(connect({ chainId }));
			} else {
				const web3ModalProvider = await web3Modal.connect();
				const provider = new ethers.providers.Web3Provider(web3ModalProvider);
				const { chainId } = await provider.getNetwork();
				dispatch(connect({ chainId }));
			}
		} catch (error) {
			console.log(error);
		}
	}

	async function Disconnect() {
		dispatch(disconnect());
		await web3Modal.clearCachedProvider();
		localStorage.removeItem("walletconnect");
	}

	const setupNetwork = async () => {
		const provider = window.ethereum;
		if (provider) {
			const chainId = parseInt(process.env.PUBLIC_CHAIN as string, 10);
			try {
				await provider.request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainId: `0x${chainId.toString(16)}`,
							chainName: "Amoy",
							nativeCurrency: {
								name: "MATIC",
								symbol: "MATIC",
								decimals: 18,
							},
							rpcUrls: [
								"https://polygon-amoy-bor-rpc.publicnode.com",
								"https://polygon-amoy.blockpi.network/v1/rpc/public",
								"https://rpc-amoy.polygon.technology",
							],
							blockExplorerUrls: ["https://www.oklink.com/amoy"],
						},
					],
				});
				return true;
			} catch (error) {
				console.error("Failed to setup the network in Metamask:", error);
				return false;
			}
		} else {
			console.error(
				"Can't setup the BSC network on metamask because window.ethereum is undefined"
			);
			return false;
		}
	};

	function wrongNetwork() {
		if (!window.ethereum) {
			Disconnect();
			return;
		}
		setupNetwork();
	}

	return (
		<header className="page-header">
			<div className="page-header__phones-row">
				<div className="container page-header__phones-container">
					<div className="page-header__phones">
						<a href={"tel:+1(123)1234567"} className="page-header__phone-link">
							<FontAwesomeIcon icon={faPhoneAlt} /> +1 (123) 123-45-67
						</a>
						<a
							href={
								"https://api.whatsapp.com/send?phone=11231234567&text=Hello!"
							}
							className="page-header__phone-link"
							target={"_blank"}
						>
							<FontAwesomeIcon icon={faWhatsapp} /> +1 (123) 123-45-67
						</a>
					</div>
					<ul className="page-header__menu list-unstyled">
						<li>
							<Link href={"/shipping"} className="page-header__phone-link">
								Shipping
							</Link>
						</li>
						<li>
							<Link href={"/about"} className="page-header__phone-link">
								About
							</Link>
						</li>
						<li>
							<div style={{ flex: "none" }}>
								{!wallet.connected && (
									<button onClick={Connect}>Connect Wallet</button>
								)}
								{wallet.connected &&
									wallet.chainId.toString() === process.env.PUBLIC_CHAIN && (
										<button
											style={{ background: "#FF5525" }}
											onClick={Disconnect}
										>
											{address
												? address.substring(0, 6) +
												  "..." +
												  address.substring(address.length - 4)
												: "Disconnect"}
										</button>
									)}
								{wallet.connected &&
									wallet.chainId.toString() !== process.env.PUBLIC_CHAIN && (
										<button
											style={{ background: "red" }}
											onClick={wrongNetwork}
										>
											Wrong Network
										</button>
									)}
							</div>
						</li>
					</ul>
				</div>
			</div>
			<div className={"page-header__logo-row"}>
				<div className="container page-header__logo-container">
					<div className={"page-header__logo-wrapper"}>
						<Link href="/" className={"page-header__logo-link"}>
							<span>THE MOON</span>
						</Link>
					</div>
					<div className={"page-header__right-blocks"}>
						<HeaderCart className={"page-header__moon-cart"} />
						<button
							type={"button"}
							className={"hamburger-btn page-header__hamburger"}
							onClick={onHamburgerBtnClicked}
						>
							<span
								className={clsx("hamburger-btn__bar", {
									"first-opened": asideIsOpened,
								})}
							/>
							<span
								className={clsx("hamburger-btn__bar", {
									"middle-opened": asideIsOpened,
								})}
							/>
							<span
								className={clsx("hamburger-btn__bar", {
									"last-opened": asideIsOpened,
								})}
							/>
						</button>
					</div>
				</div>
			</div>
			<ChooseVariantModal />
		</header>
	);
}

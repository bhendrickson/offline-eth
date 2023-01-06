#!/usr/bin/env node

import Web3 from 'web3';
import { Common } from '@ethereumjs/common'
import { FeeMarketEIP1559Transaction, TransactionFactory } from '@ethereumjs/tx'

const kUsageText = `usage: offline-eth <command> [<args>]

A tool to create, sign, and submit Ethereum transactions, that works in such a
way one can isolate keys & sigining to an offline computer. For more
information, visit: http://github.com/bhendrickson/offline-eth

commands:
  make-tx          Makes an unsigned ETH transaction (*)
  sign-tx          Adds a signature to an ETH transaction
  print-tx         Prints an ETH transaction (**)
  send-tx          Sends a signed ETH transaction (*)
  balance          Prints balance and # transactions for an address (*)
  address          Prints the public address given a private key

(*) Command requires the internet (or client connection)
(**) Command can optionaly use internet (or client connection) to display
     more data

offline-eth make-tx
    --from=<HEX_PUBLIC_ADDRESS>                From where to send [Required]
    --to=<HEX_PUBLIC_ADDRESS>                  Where to send to [Required]
    --value-eth=<DECIMAL|max>                  Amount to send
                                                 [This or value-wei is required]
    --value-wei=<INTEGER|max>                  Amount to send
                                                 [This or value-eth is required]
    --chain=<mainnet|sepolia|goerli>           Chain to use [Default: mainnet]

  Outputs a HEX_UNSIGNED_TRANSACTION, which encodes details about the desired
  transaction. It cannot be sent to the block chain until it is signed by the
  key for the 'from' address. The 'from' address is not explicit in the
  transaction, but is used to lookup the next nonce value to use when sending
  from this address. If 'max' is specified for the value of the transaction,
  then the value of the transaction is set at everything in the 'from' address
  less the most that might be spent on gas.

  The hueristics used for setting the gas price: the max gas price is capped
  at 10% above the median of recent blocks, and the priority fee is hardcoded
  to be 1 gwei.

offline-eth sign-tx
    --tx=<HEX_UNSIGNED_TRANSACTION>            Transaction to sign [Required]
    --key=<HEX_PRIVATE_KEY>                    Key to sign with as hex string
                                               [Requred]

  Outputs a HEX_SIGNED_TRANSACTION, which extends the unsigned transaction by
  filling in several fields related to the signature. A signed transaction can
  be sent to the blockchain to be included.

offline-eth print-tx
    --tx=<HEX_UNSIGNED_TRANSACTION |           Transaction to print [Required]
          HEX_SIGNED_TRANSACTION>
    --online                                   If set, will lookup up details
                                               about the addresses on the
                                               --chain.
    --chain=<mainnet|sepolia|goerli>           Chain to use [Default: mainnet]

  Outputs the transaction in JSON and some human readable details about
  the transaction to help a human confirm this transaction is correct. The
  'from' address isn't explicit in a transaction, but will be derived from the
  signature if the transaction is signed. If --online is set, then balance and
  the number of transactions for the 'to' address (and 'from' address if signed)
  is looked up and displayed. That can help confirm the to and from address are
  correct.

offline-eth send-tx
    --tx=<HEX_SIGNED_TRANSACTION>              Transaction to send [Required]
    --chain=<mainnet|sepolia|goerli>           Chain to use [Default: mainnet]

  This sends the signed transaction to the block chain. It blocks until it is
  included, and prints details about the transaction's inclusion when it
  happens.

offline-eth balance
    --address=<HEX_PUBLIC_ADDRESS>             Address to lookup [Required]
    --chain=<mainnet|sepolia|goerli>           Chain to use [Default: mainnet]

  Outputs the balance and # of transaction for this address

offline-eth address
    --key=<HEX_PRIVATE_KEY>                    Key to get address for

  Outputs the HEX_PUBLIC_ADDRESS for this key.
`;

function exitWithUsage(error) {
  if (error) {
    console.error("ERROR: " + error + "\nSee '--help' for usage information.");
    process.exit(1);
  }
  console.log(kUsageText);
  process.exit(0);
}

function take_arg(argv, name, required, default_value) {
  let prefix = "--" + name + "=";
  let bool_match = "--" + name;
  for (let i = 3; i < process.argv.length; i++) {
    let a = process.argv[i];
    if (a.startsWith(prefix)) {
      argv.splice(i, 1);
      return a.slice(prefix.length);
    } else if (a == bool_match) {
      argv.splice(i, 1);
      return true;
    }
  }
  if (required) exitWithUsage("missing required arg: " + name);
  return default_value;
}

function verify_no_extra_args(argv) {
  if (argv.length > 3) exitWithUsage("Unexpected arg: " + argv[3]);
}

function getEthClientUrl(chain) {
  if (chain == "mainnet") return "https://rpc.ankr.com/eth";
  if (chain == "sepolia") return "https://rpc.ankr.com/eth_sepolia";
  if (chain == "goerli") return "https://rpc.ankr.com/eth_goerli";
  exitWithUsage("We don't have a default RPC endpoint for the chain: " + chain);
}

async function printAccount(pkey) {
  out = web3.eth.accounts.privateKeyToAccount(pkey);
  console.log(out);
}

async function checkBalance(web3_conn, public_address) {
  let balance_wei = await web3_conn.eth.getBalance(public_address);
  let balance_eth = web3_conn.utils.fromWei(balance_wei);
  return balance_wei + " wei (" + balance_eth + " eth)";
}

async function do_make() {
  let from = take_arg(process.argv, "from", true);
  let to = take_arg(process.argv, "to", true);
  let value_eth = take_arg(process.argv, "value-eth", false);
  let value_wei = take_arg(process.argv, "value-wei", false);
  let chain = take_arg(process.argv, "chain", false, "mainnet");
  let client_url = getEthClientUrl(chain);
  verify_no_extra_args(process.argv);
  if ((value_eth == undefined) == (value_wei == undefined)) {
    exitWithUsage("must set 'value-eth' or 'value-wei' but not both");
  }

  const web3 = new Web3(client_url);

  const from_tx_count = await web3.eth.getTransactionCount(from);
  const to_tx_count = await web3.eth.getTransactionCount(to);
  const price_of_gas = await web3.eth.getGasPrice();
  const gas_cap = web3.utils.toBN(Math.ceil(price_of_gas * 1.1)); // 10% margin
  const tx_gas = web3.utils.toBN(21000);  // gas required for a simple tx

  if (value_wei == "max" || value_eth == "max") {
    const balance = web3.utils.toBN(await web3.eth.getBalance(from));
    value_wei = balance.sub(tx_gas.mul(gas_cap));
  } else if (value_wei == undefined) {
    value_wei = Web3.utils.toWei(value_eth)
  }

  let txData = {
    to: to,
    value: web3.utils.toHex(value_wei),
    gasLimit: web3.utils.toHex(tx_gas),
    maxPriorityFeePerGas: '0x01',  // a negligable but non-zero priority fee
    maxFeePerGas: web3.utils.toHex(gas_cap),
    nonce: from_tx_count,
  };

  const common = new Common({ chain: chain });
  let tx = FeeMarketEIP1559Transaction.fromTxData(txData, { common })
  console.log("0x" + tx.serialize().toString('hex'));
}

async function do_print() {
  let tx_hex = take_arg(process.argv, "tx", true);
  let online = take_arg(process.argv, "online", false, false);
  let chain = take_arg(process.argv, "chain", false, "mainnet");
  let client_url = getEthClientUrl(chain);

  verify_no_extra_args(process.argv);
  if (tx_hex.startsWith("0x")) tx_hex = tx_hex.slice(2);
  const tx = TransactionFactory.fromSerializedData(Buffer.from(tx_hex, "hex"));
  console.log("TRANSACTION AS JSON");
  console.log(tx.toJSON());

  console.log("\nINFO ABOUT TRANSACTION");
  console.log("  Is signed: " + tx.isSigned());
  let from = tx.isSigned() ? tx.getSenderAddress().toString() : null;
  if (from) console.log("  'From' address implied by sig: " + from);
  const value_eth = Web3.utils.fromWei(tx.value.toString());
  console.log("  Value: " + tx.value + " wei (" + value_eth + " eth)");

  let max_fee_per_gas = Web3.utils.toBN(tx.maxFeePerGas.toString());
  let gas_limit = Web3.utils.toBN(tx.gasLimit.toString());
  let max_fee = max_fee_per_gas.mul(gas_limit);
  let max_fee_eth = Web3.utils.fromWei(max_fee);
  console.log("  Max gas fee: " + max_fee + " wei (" + max_fee_eth + " eth)");

  if (!online) return;
  const web3 = new Web3(client_url);

  if (from) {
    console.log(
        "  Balance in 'from': " + await checkBalance(web3, from) +
        " txs: " + await web3.eth.getTransactionCount(from));
  }
  let to = tx.to.toString();
  console.log("  Balance in 'to': " + await checkBalance(web3, to) +
              " txs: " + await web3.eth.getTransactionCount(to.toString()));
}

async function do_sign() {
  let key_hex = take_arg(process.argv, "key", true);
  let tx_hex = take_arg(process.argv, "tx", true);
  verify_no_extra_args(process.argv);
  if (tx_hex.startsWith("0x")) tx_hex = tx_hex.slice(2);
  if (key_hex.startsWith("0x")) key_hex = key_hex.slice(2);
  const tx_buf = Buffer.from(tx_hex, "hex");
  const key = Buffer.from(key_hex, "hex");
  let tx = TransactionFactory.fromSerializedData(tx_buf);
  let sig = tx.sign(key);
  console.log("0x" + sig.serialize().toString('hex'));
}

async function do_send() {
  const chain = take_arg(process.argv, "chain", false, "mainnet");
  let client_url = getEthClientUrl(chain)
  const tx_hex = take_arg(process.argv, "tx", true);
  verify_no_extra_args(process.argv);
  const web3 = new Web3(client_url);
  let out = await web3.eth.sendSignedTransaction(tx_hex);
  console.log(out);
}

async function do_balance() {
  const chain = take_arg(process.argv, "chain", false, "mainnet");
  let client_url = getEthClientUrl(chain);
  const address = take_arg(process.argv, "address");
  verify_no_extra_args(process.argv);
  const web3 = new Web3(client_url);
  console.log(await checkBalance(web3, address));
}

function do_address() {
  const key_hex = take_arg(process.argv, "key");
  verify_no_extra_args(process.argv);
  console.log((new Web3()).eth.accounts.privateKeyToAccount(key_hex).address);
}

// Ugh, web3.js uses the Fetch API which spews an ExperimintalWarning to the
// console, often in the middle of our output, unless we supress it. So ugly.
const originalEmit = process.emit;
process.emit = function(name, data, ...args) {
  if (name === 'warning' && typeof data === 'object' &&
      data.name === 'ExperimentalWarning' &&
      data.message.includes('Fetch API')) {
    return false
  }
  return originalEmit.apply(process, arguments)
}

function main() {
  if (process.argv.includes("--help")) exitWithUsage();
  const action = process.argv[2];
  if (action == "make-tx") return do_make();
  if (action == "print-tx") return do_print();
  if (action == "sign-tx") return do_sign();
  if (action == "send-tx") return do_send();
  if (action == "balance") return do_balance();
  if (action == "address") return do_address();
  exitWithUsage("first arg must be an action");
}

main();

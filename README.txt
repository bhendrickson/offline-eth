Usage: offline_eth <command> [<args>]

A command line tool to create, sign, and submit Ethereum transactions. Its
primary purpose is to allow you to sign transactions on an offline computer,
improving the security of your ETH by isolating your keys and the signing
process.

This tool does not handle the transfer of unsigned or signed transaction data
between online and offline computers. There are several ways to do this
reasonably securely, such as using a USB drive, a LAN without internet access,
or, if your offline and online computers are virtual machines on the same
host, simply copying and pasting. Alternatively, you can use pen and paper for a
low-tech option.

In addition to providing isolation, the simplicity of this tool adds an
additional layer of security. It is written in a few hundred lines of code and
depends only on the widely-used and well-maintained libraries web3.js and
ethereumjs, both maintained by the Ethereum Foundation.

If you have feedback, suggestions for improvement, or would like to contribute,
please visit the tool's GitHub page at:
  http://github.com/bhendrickson/offline_eth

Possible workflow for using this tool:
  * [online PC] Use 'offline_eth make_tx' to create an unsigned transaction.
  * [online PC] Use 'offline_eth print_tx' to verify that the unsigned
    transaction is correct.
  * Transfer the unsigned transaction from the [online PC] to the [offline PC].
  * [offline PC] Use 'offline_eth sign_tx' to create a signed transaction.
  * [offline PC] Use 'offline_eth print_tx' to verify that the signed
    transaction.
  * Transfer the signed transaction from the [offline PC] to the [online PC].
  * [online PC] Use 'offline_eth print_tx' with the '--online' flag to verify
    the signed transaction again.
  * [online PC] Use 'offline_eth send_tx' to publish the transaction to the
    blockchain.

There is a risk that the offline PC may have been compromised by a sophisticated
hacker before being taken offline. If so, to steal your funds, they could try to
leak your secret key, or put the wrong transaction, in what it purports to be
the hex of your signed transaction that you are moving back to an online PC.
This scenario may seem unlikely, but it can be mitigated by inspect the signed
transaction on multiple offline PCs to ensure its accuracy.

COMMANDS
  make_tx          Makes an unsigned ETH transaction (*)
  sign_tx          Adds a signature to an ETH transaction
  print_tx         Prints an ETH transaction (**)
  send_tx          Sends a signed ETH transaction (*)
  balance          Prints balance and # transactions for an address (*)
  address          Prints the public address given a private key

(*) Command requires the internet (or client connection)
(**) Command can optionaly use internet (or client connection) to display
     more data

COMMAND ARGS AND OUTPUT
offline_eth make_tx
    --from=<HEX_PUBLIC_ADDRESS>                From where to send [Required]
    --to=<HEX_PUBLIC_ADDRESS>                  Where to send to [Required]
    --value_eth=<DECIMAL|max>                  Amount to send
                                                 [This or value_wei is required]
    --value_wei=<INTEGER|max>                  Amount to send
                                                 [This or value_eth is required]
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client_url=<HTTP_ADDRESS>                URL of ETH client
                                                 [Default: ankr.comr/rpc/...]

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

offline_eth sign_tx
    --tx=<HEX_UNSIGNED_TRANSACTION>            Transaction to sign [Required]
    --key=<HEX_PRIVATE_KEY>                    Key to sign with [Requred]

  Outputs a HEX_SIGNED_TRANSACTION, which extends th unsigned transaction by
  filling in several fields related to the signature. A signed transaction can
  be sent to the blockchain to be included.

offline_eth print_tx
    --tx=<HEX_UNSIGNED_TRANSACTION |           Transaction to print [Required]
          HEX_SIGNED_TRANSACTION>
    --online                                   If set, will use client_url to
                                               lookup up details about the
                                               addresses.
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client_url=<HTTP_ADDRESS>                URL of ETH client
                                                 [Default: ankr.comr/rpc/...]

  Outputs the transaction in JSON and some human readable details about
  the transaction to help a human confirm this transaction is correct. The
  'from' address isn't explicit in a transaction, but will be derived from the
  signature if the transaction is signed. If --online is set, then balance and
  the number of transactions for the 'to' address (and 'from' address if signed)
  is looked up and displayed. That can help confirm the to and from address are
  correct.

offline_eth send_tx
    --tx=<HEX_SIGNED_TRANSACTION>              Transaction to send [Required]
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client_url=<HTTP_ADDRESS>                URL of ETH client
                                                 [Default: ankr.comr/rpc/...]

  This uses the client_url to send the signed transaction to be included on the
  block chain.  It blocks until it is included, and prints details about the
  transaction's inclusion when it happens.

offline_eth balance
    --address=<HEX_PUBLIC_ADDRESS>             Address to lookup [Required]
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client_url=<HTTP_ADDRESS>                URL of ETH client
                                                 [Default: ankr.comr/rpc/...]

  Outputs the balance and # of transaction for this address

offline_eth address
    --key=<HEX_PRIVATE_KEY>                    Key to get address for

  Outputs the HEX_PUBLIC_ADDRESS for this key.


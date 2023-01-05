offline-eth - keep ethereum keys & signing offline
==================================================

`offline-eth` is a simple command line tool to create, sign, and submit Ethereum
transactions. Its primary purpose is to allow you to sign transactions on an
offline computer, improving the security of your ETH by isolating your keys.

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
please visit the tool's GitHub page:
http://github.com/bhendrickson/offline-eth

Possible workflow for using this tool:
  * [online PC] Use `offline-eth make-tx` to create an unsigned transaction.
  * [online PC] Use `offline-eth print-tx` to verify that the unsigned
    transaction is correct.
  * Transfer the unsigned transaction from the [online PC] to the [offline PC].
  * [offline PC] Use `offline-eth sign-tx` to create a signed transaction.
  * [offline PC] Use `offline-eth print-tx` to verify that the signed
    transaction.
  * Transfer the signed transaction from the [offline PC] to the [online PC].
  * [online PC] Use `offline-eth print-tx` with the '--online' flag to verify
    the signed transaction again.
  * [online PC] Use `offline-eth send-tx` to publish the transaction to the
    blockchain.

There is a risk that the offline PC may have been compromised by a sophisticated
hacker before being taken offline. If so, to steal your funds, they could try to
leak your secret key, or put the wrong transaction, in what it purports to be
the hex of your signed transaction that you are moving back to an online PC.
This scenario may seem unlikely, but it can be mitigated by inspect the signed
transaction on multiple offline PCs to ensure its accuracy.

INSTALLATION
============

You can install it by running:
````
  npm install -g https://github.com/bhendrickson/offline-eth
````

USAGE
=====
````
usage: offline-eth <command> [<args>]

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
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client-url=<HTTP_ADDRESS>                URL of ETH client
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

offline-eth sign-tx
    --tx=<HEX_UNSIGNED_TRANSACTION>            Transaction to sign [Required]
    --key=<HEX_PRIVATE_KEY>                    Key to sign with [Requred]

  Outputs a HEX_SIGNED_TRANSACTION, which extends th unsigned transaction by
  filling in several fields related to the signature. A signed transaction can
  be sent to the blockchain to be included.

offline-eth print-tx
    --tx=<HEX_UNSIGNED_TRANSACTION |           Transaction to print [Required]
          HEX_SIGNED_TRANSACTION>
    --online                                   If set, will use client_url to
                                               lookup up details about the
                                               addresses.
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client-url=<HTTP_ADDRESS>                URL of ETH client
                                                 [Default: ankr.comr/rpc/...]

  Outputs the transaction in JSON and some human readable details about
  the transaction to help a human confirm this transaction is correct. The
  'from' address isn't explicit in a transaction, but will be derived from the
  signature if the transaction is signed. If --online is set, then balance and
  the number of transactions for the 'to' address (and 'from' address if signed)
  is looked up and displayed. That can help confirm the to and from address are
  correct.

offline-eth send-tx
    --tx=<HEX_SIGNED_TRANSACTION>              Transaction to send [Required]
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client-url=<HTTP_ADDRESS>                URL of ETH client
                                                 [Default: ankr.comr/rpc/...]

  This uses the client_url to send the signed transaction to be included on the
  block chain.  It blocks until it is included, and prints details about the
  transaction's inclusion when it happens.

offline-eth balance
    --address=<HEX_PUBLIC_ADDRESS>             Address to lookup [Required]
    --chain=<mainnet|sepolia|...>              Chain to use [Default: mainnet]
    --client-url=<HTTP_ADDRESS>                URL of ETH client
                                                 [Default: ankr.comr/rpc/...]

  Outputs the balance and # of transaction for this address

offline-eth address
    --key=<HEX_PRIVATE_KEY>                    Key to get address for

  Outputs the HEX_PUBLIC_ADDRESS for this key.
````


EXAMPLE
=======
Here is an example using it to move some funds around

````
# First we make ourselves some keys using our offline-pc
offline$ KEY_ONE=$(openssl rand -hex 32)
offline$ KEY_TWO=$(openssl rand -hex 32)

# If you print those keys, you'll just see some hex bytes
offline$ echo $KEY_ONE
13f8087e10f6a901c711526aa3de2f81f4a402da4cb389ac175929e04a36cd34

# But now I've told you key, so I'll make myself a different one.
offline$ KEY_ONE=$(openssl rand -hex 32)

# let's see the public addresses for our new keys
offline$ offline-eth address --key=$KEY_ONE
0x34FE9C5F2964c1f4607b384327f07955B679beDf

offline$ offline-eth address --key=$KEY_TWO
0xb4d54Eb1d089D757f680a9A76383Acd02955F0DE

# Suppose we got money into the first address, perhaps using a
# faucet if on a test net, or by transfering ETH from an exchange
# on mainnet. Here I've done it on the test net.

# Now we'll transfer funds from our first address to our second address.

# We use our online PC to make the transaction object.
online$ offline-eth make-tx --from=0x34FE9C5F2964c1f4607b384327f07955B679beDf --to=0xb4d54Eb1d089D757f680a9A76383Acd02955F0DE --value-eth=0.01 --chain=sepolia
0x02f083aa36a7800184a3e9ab8882520894b4d54eb1d089d757f680a9a76383acd02955f0de872386f26fc1000080c0808080

# It is hard to read hex, so you might want to convert that to something
# human readability to make sure it is what you expect
online$ offline-eth print-tx --tx=0x02f083aa36a7800184a3e9ab8882520894b4d54eb1d089d757f680a9a76383acd02955f0de872386f26fc1000080c0808080
TRANSACTION AS JSON
{
  chainId: '0xaa36a7',
  nonce: '0x0',
  maxPriorityFeePerGas: '0x1',
  maxFeePerGas: '0xa3e9ab88',
  gasLimit: '0x5208',
  to: '0xb4d54eb1d089d757f680a9a76383acd02955f0de',
  value: '0x2386f26fc10000',
  data: '0x',
  accessList: [],
  v: '0x0',
  r: undefined,
  s: undefined
}

INFO ABOUT TRANSACTION
  Is signed: false
  Value: 10000000000000000 wei (0.01 eth)
  Max gas fee: 57750000168000 wei (0.000057750000168 eth)

# That does look right. Let's move back to our offline pc and sign it.
offline$ offline-eth sign-tx --tx=0x02f083aa36a7800184a3e9ab8882520894b4d54eb1d089d757f680a9a76383acd02955f0de872386f26fc1000080c0808080 --key=$KEY_ONE
0x02f87083aa36a7800184a3e9ab8882520894b4d54eb1d089d757f680a9a76383acd02955f0de872386f26fc1000080c080a0817a97c0a7843f3e22bbc737ce4467dae5d98ad8b1d1df2c5b1717aaa780b93aa05c7408c7090ba8226a024e60ec2e61bddc0837d354d549eee1e4f1d837d3121f

# That hex blob is the signed version of the transaction. Again, we can print
# it as something more human readable:
offline$ offline-eth print-tx --tx=0x02f87083aa36a7800184a3e9ab8882520894b4d54eb1d089d757f680a9a76383acd02955f0de872386f26fc1000080c080a0817a97c0a7843f3e22bbc737ce4467dae5d98ad8b1d1df2c5b1717aaa780b93aa05c7408c7090ba8226a024e60ec2e61bddc0837d354d549eee1e4f1d837d3121f
TRANSACTION AS JSON
{
  chainId: '0xaa36a7',
  nonce: '0x0',
  maxPriorityFeePerGas: '0x1',
  maxFeePerGas: '0xa3e9ab88',
  gasLimit: '0x5208',
  to: '0xb4d54eb1d089d757f680a9a76383acd02955f0de',
  value: '0x2386f26fc10000',
  data: '0x',
  accessList: [],
  v: '0x0',
  r: '0x817a97c0a7843f3e22bbc737ce4467dae5d98ad8b1d1df2c5b1717aaa780b93a',
  s: '0x5c7408c7090ba8226a024e60ec2e61bddc0837d354d549eee1e4f1d837d3121f'
}

INFO ABOUT TRANSACTION
  Is signed: true
  'From' address implied by sig: 0x34fe9c5f2964c1f4607b384327f07955b679bedf
  Value: 10000000000000000 wei (0.01 eth)
  Max gas fee: 57750000168000 wei (0.000057750000168 eth)

# Most fields are the same as before, although r and s are now filled as those
# are part of the signature. From them, we can derive from the from address,
# which is printed at the bottom in the INFO section.

# Given the transaction looks good, let's move it back to the online PC and
# send it to blockchain
online$ offline-eth send-tx --chain=sepolia --tx=0x02f87083aa36a7800184a3e9ab8882520894b4d54eb1d089d757f680a9a76383acd02955f0de872386f26fc1000080c080a0817a97c0a7843f3e22bbc737ce4467dae5d98ad8b1d1df2c5b1717aaa780b93aa05c7408c7090ba8226a024e60ec2e61bddc0837d354d549eee1e4f1d837d3121f
{
  blockHash: '0x29319325ac3db23e9ba304cee46318b017ae201973d427230838ece1a8f3c772',
  blockNumber: 2627449,
  contractAddress: null,
  cumulativeGasUsed: 21000,
  effectiveGasPrice: 8,
  from: '0x34fe9c5f2964c1f4607b384327f07955b679bedf',
  gasUsed: 21000,
  logs: [],
  logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  status: true,
  to: '0xb4d54eb1d089d757f680a9a76383acd02955f0de',
  transactionHash: '0xadad33f79216b9a6e06b27c4d35643c268638fae0473514330d6ca8323171d56',
  transactionIndex: 0,
  type: '0x2'
}

# Success! We just moved some ETH around!
````

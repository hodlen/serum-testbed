const { PublicKey } = require('@solana/web3.js');
const { Market } = require('@project-serum/serum');
const { AnchorProvider } = require('@project-serum/anchor');
const { getATAAddressSync } = require('@saberhq/token-utils');

async function main() {
  const provider = AnchorProvider.local('https://solana-api.projectserum.com');
  const { connection } = provider;
  let marketAddress = new PublicKey('skGujYm3UcaPuxewpaWx8oG6ZqRssPZcxhkKbUpAsdh');
  let programAddress = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
  let market = await Market.load(connection, marketAddress, {}, programAddress);

  // Retrieving open orders by owner
  let myOrders = await market.loadOrdersForOwner(connection, provider.publicKey);

  // Cancelling orders
  for (let order of myOrders) {
    // console.log(order, order.openOrdersAddress.toString())
    const cancelTx = await market.makeCancelOrderTransaction(connection, provider.publicKey, order);
    const simRes = await provider.simulate(cancelTx)
    console.log(simRes.logs.join('\n'))
    // const res = await provider.sendAndConfirm(cancelTx);
    // console.log(res)
  }

  // Settle funds
  for (let openOrders of await market.findOpenOrdersAccountsForOwner(
    connection,
    provider.publicKey,
  )) {
    console.log(openOrders.address.toString(), openOrders.baseTokenFree.toString(), openOrders.quoteTokenFree.toString())
    if (openOrders.baseTokenFree > 0 || openOrders.quoteTokenFree > 0) {
      // spl-token accounts to which to send the proceeds from trades
      let baseTokenAccount = await getATAAddressSync({ mint: market.baseMintAddress, owner: provider.publicKey })
      let quoteTokenAccount = await getATAAddressSync({ mint: market.quoteMintAddress, owner: provider.publicKey })

      const settleTx = await market.makeSettleFundsTransaction(
        connection,
        openOrders,
        provider.publicKey,
        baseTokenAccount,
        quoteTokenAccount,
      );
      const simRes = await provider.simulate(settleTx.transaction, settleTx.signers)
      console.log(simRes.logs.join('\n'))
    }
  }
}

main();
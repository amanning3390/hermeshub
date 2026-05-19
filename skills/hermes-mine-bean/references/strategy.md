# MineBean Strategy Notes

Optional reading for users who want to customize their `mine-bean` skill beyond the defaults.

## How MineBean works in two paragraphs

MineBean runs 60-second rounds on a 5x5 grid. Each round, miners deploy ETH to one or more blocks. After 60 seconds, Chainlink VRF picks a winning block uniformly at random. Miners who deployed to the winning block split that round's prize pool proportionally to their deploy. A 10% fee on losers' ETH goes to the protocol treasury. 1 BEAN is minted to winners per round. A separate beanpot pool accumulates 0.1 BEAN per round and pays out on a 1-in-777 trigger.

The skill in this repo deploys ETH on a cron. It does not try to predict the winning block (Chainlink VRF is uniformly random, so prediction is impossible). It optimizes for consistent participation, not for round-by-round edge.

## Why the default deploys all 25 blocks

When you deploy to all 25 blocks equally, you are guaranteed to be on the winning block every round. You will not win the entire pool, but you will reliably collect a proportional share plus the 1 BEAN per round you participate in, minus the protocol fee.

This is the "AutoMiner All" strategy. It is the safest default for a hands-off agent because:

- It cannot have a zero-payout round
- It earns BEAN every round it fires
- It has the lowest variance (small steady earnings, no boom-or-bust)

The tradeoff: when grid totals are large and you only deployed the minimum per block, your proportional share of the pool is tiny. Your edge is the BEAN reward, not the ETH pool.

## When to customize

Consider editing `DEPLOY_BLOCKS` and `DEPLOY_PER_BLOCK_WEI` if any of these apply:

**You want to chase the beanpot.** The beanpot triggers ~1 in 777 rounds. If you deploy to all 25 blocks every cron tick, you are entitled to a share of the beanpot whenever it hits. Higher per-block deploy = larger share when it lands.

**You want to fire less frequently but with more conviction.** Lower the cron rate or add custom conditions. If you only deploy when the beanpot pool is above some threshold (e.g., > 50 BEAN), you save gas on small-pot rounds.

**You want to play a specific subset of blocks.** Each block has the same 1/25 win probability (VRF is uniform). Smaller subsets have higher variance and higher payouts when they win. There is no statistical edge to picking any specific block. All "strategy" beyond block count is psychological.

## Expected value math

Per-round EV from the perspective of deploying X ETH across N blocks equally:

```
T = total ETH on the grid (from all miners, including you)
P = BEAN price in ETH (read /api/price -> bean.priceNative on api.minebean.com)
ADMIN_FEE_BPS = 100         (1%)
VAULT_FEE_BPS = 1000        (10% on losers only)
BEAN_PER_ROUND = 1.0        (paid to winners)
BEANPOT_TRIGGER = 1/777
BEANPOT_AVG_POOL = read /api/round/current -> beanpotPoolFormatted

share_of_winning_block = (X / N) / total_on_winning_block

ETH_EV ≈ (your share of claimablePool) - X * 0.01  (admin fee)
BEAN_EV = BEAN_PER_ROUND * P
BEANPOT_EV = BEANPOT_TRIGGER * BEANPOT_AVG_POOL * P * share_of_winning_block

Total EV per fired round ≈ ETH_EV + BEAN_EV + BEANPOT_EV
```

For the default config (25 blocks, 0.0000025 ETH per block), you are always on the winning block, so `share_of_winning_block` equals your deploy on that block divided by the total deploy on that block (across all miners).

## Honest caveat

This is a recreational mining protocol on a Layer 2. Don't run this skill with money you can't lose. The default config is intentionally tiny (~$0.05 a day) so a misconfigured cron or a bug doesn't drain a meaningful balance. If you raise `DEPLOY_PER_BLOCK_WEI`, raise the safety cap in `scripts/deploy.sh` to match and understand that you've removed the footgun rail.

## When NOT to use this skill

- If you want frequent active play, use the MineBean web app at minebean.com directly. The site updates in real time and lets you react to grid state within the 60-second window.
- If you want managed agent strategies (Sniper, Anti-Winner, Beanpot Hunter, Anti-Loser, Nostradamus), use the AGENT tab on minebean.com. Those agents fire every round via the protocol's on-chain AutoMiner.
- If you don't actually want to run an autonomous mining bot, just deploy manually on the website.

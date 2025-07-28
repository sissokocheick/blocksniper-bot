const { ethers } = require("ethers");
require("dotenv").config();

// --- MODIFIED: Correct path to the artifact file ---
const contractArtifact = require("./artifacts/contracts/BlockSniper.sol/BlockSniper.json");
const contractABI = contractArtifact.abi;

// --- Configuration ---
const contractAddress = "0x0AC1931C0899de0096661F166195076d62a95e49"; // 👈 Update this
const RPC_URL = process.env.SOMNIA_RPC_URL; 
const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY; 

async function main() {
  const network = {
      name: "somnia-testnet",
      chainId: 50312,
      ensAddress: null 
  };
  const provider = new ethers.JsonRpcProvider(RPC_URL, network);
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, ownerWallet);

  const stalePools = new Set(); 

  console.log("🤖 Bot démarré. En écoute des événements SnipeMiss...");

  contract.on("SnipeMiss", (player, blockTarget, entryFee) => {
    const target = blockTarget.toString();
    console.log(`[EVENT] Nouvelle cible ratée détectée : ${target}`);
    stalePools.add(target);
  });

  setInterval(async () => {
    if (stalePools.size === 0) return;

    console.log(`[CHECK] Vérification de ${stalePools.size} cagnotte(s)...`);
    const currentBlock = await provider.getBlockNumber();
    
    for (const target of stalePools) {
      if (currentBlock > parseInt(target) + 20) {
        console.log(`[ACTION] Le bloc ${target} est dans le passé. Tentative de collecte...`);
        try {
          const tx = await contract.collectAndDistributeStalePool(target);
          await tx.wait();
          console.log(`✅ [SUCCESS] Cagnotte du bloc ${target} collectée !`);
          stalePools.delete(target);
        } catch (error) {
          console.error(`❌ [FAIL] Échec de la collecte pour le bloc ${target}:`, error.message);
          if (error.message.includes("No prize pool to collect")) {
            stalePools.delete(target);
          }
        }
      }
    }
  }, 60000); 
}

main().catch(console.error);
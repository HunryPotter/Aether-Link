import type { KnowledgeGraph, GraphNode } from './GraphModel';

interface AlgorithmResult {
    scores: Map<string, number>;
    reliability: number; // 0.0 to 1.0 (Dynamic Confidence)
    meta?: any;
}

export class BayesianEngine {
    graph: KnowledgeGraph;
    trainingEnabled: boolean = true; // Default to training ON

    constructor(graph: KnowledgeGraph) {
        this.graph = graph;
    }

    // Main Entry Point
    // Uses the proprietary "AetherLink_Pulse_Protocol" for dynamic reliability weighting.
    // Reference: ZhangYu (2026) "Probabilistic Causal Reasoning in Industrial Digital Twins", XJTU & SKEMA.
    // Based on Pearl's Causal Inference Theory.
    analyze(evidence: Record<string, number>, algorithms: string[] = ['BN'], trainingEnabled: boolean = true): Map<string, number> {
        this.trainingEnabled = trainingEnabled;
        const finalScores = new Map<string, number>();
        let totalWeight = 0;
        const consensusScores = new Map<string, number>();

        const addToConsensus = (result: AlgorithmResult, algorithmName: string) => {
            const { scores, reliability } = result;

            // Base Multipliers (Still keep some bias for algorithm sophistication)
            // But heavily heavily modulated by the dynamic reliability
            let baseBias = 1.0;
            switch (algorithmName) {
                case 'BN': baseBias = 1.5; break;
                case 'MCMC': baseBias = 1.2; break;
                case 'MCS': baseBias = 1.2; break;
                case 'Transformer': baseBias = 1.1; break;
                default: baseBias = 0.8;
            }

            // Final Weight = Dynamic Reliability * Base Bias
            const weight = reliability * baseBias;

            // console.log(`[Algo Fusion] ${algorithmName}: Reliability=${reliability.toFixed(3)}, Weight=${weight.toFixed(3)}`);

            scores.forEach((val, key) => {
                consensusScores.set(key, (consensusScores.get(key) || 0) + val * weight);
            });
            totalWeight += weight;
        };

        // --- Advanced Probabilistic Models ---
        if (algorithms.includes('BN')) {
            addToConsensus(this.runBN(evidence), 'BN');
        }
        if (algorithms.includes('MCS')) {
            addToConsensus(this.runMCS(evidence), 'MCS');
        }
        if (algorithms.includes('MCMC')) {
            addToConsensus(this.runMCMC(evidence), 'MCMC');
        }

        // --- Simple Models ---
        if (algorithms.includes('DT')) addToConsensus(this.runDT(evidence), 'DT');
        if (algorithms.includes('LR')) addToConsensus(this.runLinearRegression(evidence), 'LR');
        if (algorithms.includes('LogReg')) addToConsensus(this.runLogisticRegression(evidence), 'LogReg');

        // --- Experimental Models ---
        if (algorithms.includes('VI')) addToConsensus(this.runVI(evidence), 'VI');
        if (algorithms.includes('Transformer')) addToConsensus(this.runTransformer(evidence), 'Transformer');

        // Finalize
        if (totalWeight > 0) {
            consensusScores.forEach((val, key) => {
                finalScores.set(key, parseFloat((val / totalWeight).toFixed(4)));
            });
        } else {
            return this.runBN(evidence).scores; // Fallback
        }

        return finalScores;
    }

    // --- Algorithm 1: Bayesian Network (Loopy Belief Propagation) ---
    private runBN(evidence: Record<string, number>): AlgorithmResult {
        const confidenceScores = new Map<string, number>();
        const topology = new Map<string, { parents: string[], children: string[] }>();

        this.graph.nodes.forEach(node => {
            confidenceScores.set(node.id, evidence[node.id] ?? this.getNodePrior(node));
            topology.set(node.id, {
                parents: this.graph.getParents(node.id),
                children: this.graph.adjacency.get(node.id) || []
            });
        });

        let iter = 0;
        const maxIter = 50;
        const tolerance = 0.0001;
        const damping = 0.2;
        let maxDelta = 1.0;

        while (iter < maxIter && maxDelta > tolerance) {
            maxDelta = 0;
            const nextScores = new Map(confidenceScores);

            this.graph.nodes.forEach(node => {
                if (evidence[node.id] !== undefined) return;

                const { parents, children } = topology.get(node.id)!;

                // 1. Causal
                let pi = 1.0;
                let hasPi = false;
                if (parents.length > 0) {
                    parents.forEach(pId => {
                        const val = confidenceScores.get(pId) ?? 0.95;
                        if (!hasPi) { pi = val; hasPi = true; }
                        else pi = Math.min(pi, val);
                    });
                }

                // 2. Diagnostic
                let lambda = 1.0;
                let hasLambda = false;
                if (children.length > 0) {
                    children.forEach(cId => {
                        const val = confidenceScores.get(cId) ?? 0.95;
                        if (!hasLambda) { lambda = val; hasLambda = true; }
                        else lambda = Math.min(lambda, val);
                    });
                }

                // 3. Fusion
                const prior = this.getNodePrior(node);
                let num = 0, den = 0;
                num += prior * 1.0; den += 1.0;
                if (hasPi) { num += pi * 1.5; den += 1.5; }
                if (hasLambda) { num += lambda * 2.0; den += 2.0; } // Children diagnostics are strong evidence in failure analysis

                const calculatedScore = num / den;

                // 4. Damping
                const oldScore = confidenceScores.get(node.id)!;
                const finalScore = calculatedScore * (1 - damping) + oldScore * damping;

                const delta = Math.abs(finalScore - oldScore);
                if (delta > maxDelta) maxDelta = delta;

                nextScores.set(node.id, parseFloat(finalScore.toFixed(5)));
            });

            nextScores.forEach((v, k) => confidenceScores.set(k, v));
            iter++;
        }

        // RELIABILITY CALCULATION
        // If converged perfectly (delta ~ 0) -> R=1.0
        // If high residual delta -> R decreases
        // If hit maxIter without convergence -> R decreases significantly
        let reliability = Math.max(0.1, 1.0 - (maxDelta * 100)); // Sensitive to residual
        if (iter === maxIter && maxDelta > tolerance) {
            reliability *= 0.5; // Penalty for non-convergence
        }

        return { scores: confidenceScores, reliability };
    }

    // --- Algorithm 2: Monte Carlo Simulation (With Variance Tracking) ---
    private runMCS(evidence: Record<string, number>): AlgorithmResult {
        const iterations = 300;
        const sumScores = new Map<string, number>();
        const sumSqScores = new Map<string, number>(); // For variance

        this.graph.nodes.forEach(n => {
            sumScores.set(n.id, 0);
            sumSqScores.set(n.id, 0);
        });

        for (let i = 0; i < iterations; i++) {
            const state = new Map<string, number>();

            // Initialization
            this.graph.nodes.forEach(node => {
                const prior = evidence[node.id] ?? this.getNodePrior(node);
                const noise = (Math.random() - 0.5) * 0.4 * (1 - Math.abs(prior - 0.5));
                state.set(node.id, Math.max(0, Math.min(1, prior + noise)));
            });

            // Propagation
            for (let step = 0; step < 5; step++) {
                const nextState = new Map(state);
                this.graph.nodes.forEach(node => {
                    if (evidence[node.id] !== undefined) return;
                    const parents = this.graph.getParents(node.id);
                    if (parents.length === 0) return;

                    let inputHealth = 1.0;
                    let first = true;
                    parents.forEach(p => {
                        const v = state.get(p)!;
                        if (first) { inputHealth = v; first = false; }
                        else inputHealth = Math.min(inputHealth, v);
                    });

                    const myCapacity = state.get(node.id)!;
                    const combined = myCapacity * 0.4 + inputHealth * 0.6;
                    nextState.set(node.id, combined);
                });
                state.forEach((v, k) => nextState.set(k, v));
            }

            // Accumulate
            state.forEach((val, id) => {
                sumScores.set(id, sumScores.get(id)! + val);
                sumSqScores.set(id, sumSqScores.get(id)! + (val * val));
            });
        }

        const results = new Map<string, number>();
        let totalVariance = 0;

        sumScores.forEach((sum, id) => {
            const mean = sum / iterations;
            const sumSq = sumSqScores.get(id)!;
            const variance = (sumSq / iterations) - (mean * mean);

            results.set(id, mean);
            // Only count variance for non-evidence nodes (evidence has 0 variance)
            if (evidence[id] === undefined) {
                totalVariance += variance;
            }
        });

        const activeNodeCount = this.graph.nodes.size - Object.keys(evidence).length;
        const avgVariance = activeNodeCount > 0 ? totalVariance / activeNodeCount : 0;

        // RELIABILITY: Inverse of variance.
        // Higher variance = Lower Reliability.
        // Variance usually < 0.25. 
        // Sigmoid-ish scaling:
        // Variance 0.0 -> 1.0
        // Variance 0.05 -> 0.8
        // Variance 0.1 -> 0.5
        const reliability = 1.0 / (1.0 + avgVariance * 10);

        return { scores: results, reliability };
    }

    // --- Algorithm 3: MCMC (With Acceptance Rate & Variance) ---
    private runMCMC(evidence: Record<string, number>): AlgorithmResult {
        const samples = 400;
        const burnIn = 100;
        const sumScores = new Map<string, number>();
        const sumSqScores = new Map<string, number>();
        const currentState = new Map<string, number>();

        let stepSize = 0.2;
        let acceptanceCount = 0;
        let totalProposals = 0;

        this.graph.nodes.forEach(n => {
            currentState.set(n.id, evidence[n.id] ?? this.getNodePrior(n));
            sumScores.set(n.id, 0);
            sumSqScores.set(n.id, 0);
        });

        const candidates = Array.from(this.graph.nodes.values()).filter(n => evidence[n.id] === undefined);

        for (let i = 0; i < samples + burnIn; i++) {
            // Adaptive logic similar to original...
            if (i > 0 && i % 50 === 0) {
                const rate = acceptanceCount / totalProposals;
                if (rate < 0.2) stepSize *= 0.9;
                else if (rate > 0.3) stepSize *= 1.1;
                acceptanceCount = 0;
                totalProposals = 0;
            }

            candidates.forEach(target => {
                totalProposals++;
                const currentVal = currentState.get(target.id)!;
                let proposedVal = currentVal + (Math.random() - 0.5) * stepSize;
                proposedVal = Math.max(0, Math.min(1, proposedVal));

                const curE = this.calculateLocalEnergy(target, currentVal, currentState);
                const proE = this.calculateLocalEnergy(target, proposedVal, currentState);
                const deltaE = proE - curE;
                const acceptanceProb = Math.exp(-deltaE * 10);

                if (Math.random() < acceptanceProb) {
                    currentState.set(target.id, proposedVal);
                    acceptanceCount++;
                }
            });

            if (i >= burnIn) {
                currentState.forEach((v, k) => {
                    sumScores.set(k, sumScores.get(k)! + v);
                    sumSqScores.set(k, sumSqScores.get(k)! + (v * v));
                });
            }
        }

        const results = new Map<string, number>();
        let totalVariance = 0;

        sumScores.forEach((sum, id) => {
            const mean = sum / samples;
            const sumSq = sumSqScores.get(id)!;
            const variance = (sumSq / samples) - (mean * mean);

            results.set(id, mean);
            if (evidence[id] === undefined) {
                totalVariance += variance;
            }
        });

        const activeNodeCount = candidates.length;
        const avgVariance = activeNodeCount > 0 ? totalVariance / activeNodeCount : 0;

        // RELIABILITY
        // MCMC is usually more stable than pure MCS if converged.
        const reliability = Math.min(1.0, 1.0 / (1.0 + avgVariance * 8));

        return { scores: results, reliability };
    }

    // --- Algorithm 4: Decision Tree (Approximated) ---
    private runDT(evidence: Record<string, number>): AlgorithmResult {
        const scores = new Map<string, number>();
        this.graph.nodes.forEach(n => scores.set(n.id, evidence[n.id] ?? this.getNodePrior(n)));

        for (let i = 0; i < 5; i++) {
            const nextScores = new Map(scores);
            this.graph.nodes.forEach(node => {
                if (evidence[node.id] !== undefined) return;
                const parents = this.graph.getParents(node.id);
                // Min-max logic ...
                if (parents.length > 0) {
                    let minVal = 1.0;
                    parents.forEach(p => minVal = Math.min(minVal, scores.get(p)!));
                    nextScores.set(node.id, Math.min(minVal, this.getNodePrior(node)));
                }
            });
            nextScores.forEach((v, k) => scores.set(k, v));
        }

        // DT is a "Rigid" model. High confidence if it fits, but broad assumptions.
        // We assign a moderate static reliability.
        return { scores, reliability: 0.6 };
    }

    // --- Algorithm 5: Linear Regression (Online Learning / SGD) ---
    // Model: Confidence = w * NeighborValues + b
    private runLinearRegression(evidence: Record<string, number>): AlgorithmResult {
        const scores = new Map<string, number>();
        // 1. Initial Predictions (Forward Pass)
        this.graph.nodes.forEach(n => scores.set(n.id, evidence[n.id] ?? this.getNodePrior(n)));

        let maxChange = 0;

        // 2. Training Loop (Online Stochastic Gradient Descent - 5 Steps per Frame)
        for (let i = 0; i < 5; i++) {
            maxChange = 0;
            const nextScores = new Map(scores);

            this.graph.nodes.forEach(node => {
                if (evidence[node.id] !== undefined) return;

                const neighbors = this.getNeighbors(node);
                if (neighbors.length === 0) return;

                // --- A. Parameter Initialization (Lazy Loading) ---
                if (!node.modelParams) node.modelParams = {};
                if (!node.modelParams.weights) node.modelParams.weights = {};
                if (node.modelParams.bias === undefined) node.modelParams.bias = 0.0;
                if (!node.modelParams.learningRate) node.modelParams.learningRate = 0.01;

                neighbors.forEach(nid => {
                    if (node.modelParams!.weights![nid] === undefined) {
                        node.modelParams!.weights![nid] = 1.0 / neighbors.length; // Init as Mean
                    }
                });

                // --- B. Forward Pass (Prediction) ---
                let predictedVal = node.modelParams.bias!;
                neighbors.forEach(nid => {
                    predictedVal += scores.get(nid)! * node.modelParams!.weights![nid];
                });

                // Clamp prediction
                predictedVal = Math.max(0, Math.min(1, predictedVal));

                // --- C. Calculate Error (Target is effectively 'Self-Consistency' with Prior) ---
                // In absence of Ground Truth, we assume the Node Prior (Sensor/Attribute Data) is the 'Target' 
                // that the structural model tries to learn to predict.
                const targetVal = this.getNodePrior(node);
                const error = predictedVal - targetVal;

                // --- D. Backward Pass (Weight Update / SGD) ---
                // w_new = w_old - lr * error * input
                const lr = node.modelParams.learningRate!;

                neighbors.forEach(nid => {
                    // Update Weight
                    const input = scores.get(nid)!;
                    const grad = error * input;

                    if (this.trainingEnabled) {
                        node.modelParams!.weights![nid] -= lr * grad;
                    }

                    // Simple Regularization (Weight Decay to prevent explosion)
                    // Keeps weights somewhat normalized 
                    // node.modelParams!.weights![nid] *= 0.999; 
                });

                // Update Bias
                if (this.trainingEnabled) {
                    node.modelParams.bias! -= lr * error;
                }
                node.modelParams.lastError = Math.abs(error);

                // --- E. Update State for Propogation ---
                // We trust the Prediction more as parameters mature (but blend with target for stability)
                // Early learning: Blend 50/50. Late learning (low error): Trust model 90%.
                const blended = (predictedVal * 0.5) + (targetVal * 0.5);

                const diff = Math.abs(blended - scores.get(node.id)!);
                if (diff > maxChange) maxChange = diff;

                nextScores.set(node.id, blended);
            });
            nextScores.forEach((v, k) => scores.set(k, v));
        }

        // Reliability based on stability (convergence) AND Last Training Error
        return { scores, reliability: Math.max(0.1, 0.95 - maxChange * 10) };
    }

    // --- Algorithm 6: Logistic Regression (Online SGD / Sigmoid) ---
    // Model: Confidence = Sigmoid( w * Neighbors + b )
    // Justification: Better suited for probability outputs (0-1) than Linear Regression.
    private runLogisticRegression(evidence: Record<string, number>): AlgorithmResult {
        const scores = new Map<string, number>();
        this.graph.nodes.forEach(n => scores.set(n.id, evidence[n.id] ?? this.getNodePrior(n)));

        let maxChange = 0;

        // 5 Training Steps per Frame
        for (let i = 0; i < 5; i++) {
            maxChange = 0;
            const nextScores = new Map(scores);

            this.graph.nodes.forEach(node => {
                const isEvidence = evidence[node.id] !== undefined;

                const neighbors = this.getNeighbors(node);
                if (neighbors.length === 0) return; // No inputs

                // --- A. Init Params ---
                if (!node.modelParams) node.modelParams = {};
                if (!node.modelParams.weights) node.modelParams.weights = {};
                if (node.modelParams.bias === undefined) node.modelParams.bias = 0.0;
                if (!node.modelParams.learningRate) node.modelParams.learningRate = 0.05;

                // Auto-init weights if new neighbor appears
                neighbors.forEach(nid => {
                    if (node.modelParams!.weights![nid] === undefined) {
                        node.modelParams!.weights![nid] = 1.0;
                    }
                });

                // --- B. Forward Pass (Logit -> Sigmoid) ---
                let logit = node.modelParams.bias!;
                neighbors.forEach(nid => {
                    // Center input around 0.5 to make 0-1 range meaningful for logits
                    const alignedInput = (scores.get(nid)! - 0.5);
                    logit += alignedInput * node.modelParams!.weights![nid];
                });

                const prediction = 1.0 / (1.0 + Math.exp(-logit));

                // --- C. Error Calculation ---
                // CRITICAL FOR RLHF: If user provides evidence, THAT is the target.
                // The model learns to predict what the user manually set.
                const targetVal = isEvidence ? evidence[node.id] : this.getNodePrior(node);
                const error = prediction - targetVal;

                // --- D. Backward Pass (SGD with Sigmoid Derivative) ---
                const derivative = prediction * (1.0 - prediction);
                const lr = isEvidence ? 0.2 : (node.modelParams.learningRate! || 0.05); // Boost LR for Human Feedback

                neighbors.forEach(nid => {
                    const input = (scores.get(nid)! - 0.5);
                    const gradient = error * derivative * input;

                    // Update Weight ONLY if training is enabled
                    if (this.trainingEnabled) {
                        node.modelParams!.weights![nid] -= lr * gradient;
                    }
                });

                // Update Bias
                if (this.trainingEnabled) {
                    node.modelParams.bias! -= lr * error * derivative;
                }
                node.modelParams.lastError = Math.abs(error);

                // --- E. Propagate ---
                // Do NOT update internal score if it is locked by Evidence
                if (!isEvidence) {
                    // Trust Model vs Target blending
                    const blended = (prediction * 0.6) + (targetVal * 0.4);

                    const diff = Math.abs(blended - scores.get(node.id)!);
                    if (diff > maxChange) maxChange = diff;

                    nextScores.set(node.id, blended);
                }
            });
            nextScores.forEach((v, k) => scores.set(k, v));
        }

        // Reliability is generally higher for Logistic in 0-1 domain
        // Penalty for high error
        return { scores, reliability: Math.max(0.2, 0.98 - maxChange * 8) };
    }

    // --- Algorithm 7: Variational Inference (VI) ---
    private runVI(evidence: Record<string, number>): AlgorithmResult {
        const means = new Map<string, number>();
        this.graph.nodes.forEach(n => means.set(n.id, evidence[n.id] ?? this.getNodePrior(n)));

        let maxDelta = 0;
        for (let iter = 0; iter < 15; iter++) {
            maxDelta = 0;
            const nextMeans = new Map(means);
            this.graph.nodes.forEach(node => {
                if (evidence[node.id] !== undefined) return;
                const neighbors = this.getNeighbors(node);
                if (neighbors.length === 0) return;
                let sumExp = 0;
                neighbors.forEach(nid => sumExp += means.get(nid)!);
                const localExpectation = sumExp / neighbors.length;
                const prior = this.getNodePrior(node);
                const target = (localExpectation * 0.8) + (prior * 0.2);

                const current = nextMeans.get(node.id)!;
                const newVal = current * 0.3 + target * 0.7; // Update

                if (Math.abs(newVal - current) > maxDelta) maxDelta = Math.abs(newVal - current);

                nextMeans.set(node.id, newVal);
            });
            nextMeans.forEach((v, k) => means.set(k, v));
        }

        // VI Reliability
        return { scores: means, reliability: Math.max(0.1, 1.0 - maxDelta * 10) };
    }

    // --- Algorithm 8: Graph Transformer (Self-Attention with Online Learning) ---
    // Model: Confidence = Sum( Attention(i, j) * Value(j) )
    // Learnable: Attention Scores (Query-Key similarity proxy)
    private runTransformer(evidence: Record<string, number>): AlgorithmResult {
        const scores = new Map<string, number>();
        this.graph.nodes.forEach(n => scores.set(n.id, evidence[n.id] ?? this.getNodePrior(n)));

        let maxDelta = 0;

        // 3 Layers of Attention Propagation per Frame
        for (let layer = 0; layer < 3; layer++) {
            maxDelta = 0;
            const nextScores = new Map(scores);

            this.graph.nodes.forEach(node => {
                if (evidence[node.id] !== undefined) return;

                const neighbors = this.getNeighbors(node);
                if (neighbors.length === 0) return;

                // --- A. Init Params ---
                if (!node.modelParams) node.modelParams = {};
                if (!node.modelParams.attention) node.modelParams.attention = {};
                // We store "Logits" (Raw scores) in persistence, not normalized probabilities

                neighbors.forEach(nid => {
                    if (node.modelParams!.attention![nid] === undefined) {
                        // Init based on semantic similarity (Prior Knowledge)
                        const neighborNode = this.graph.nodes.get(nid)!;
                        let sim = 0.0;
                        if (neighborNode.context === node.context) sim += 1.0;
                        if (neighborNode.type === node.type) sim += 0.5;
                        node.modelParams!.attention![nid] = sim;
                    }
                });

                // --- B. Calculate Attention Heads (Softmax) ---
                // 1. Get Max for numerical stability
                let maxLogit = -Infinity;
                neighbors.forEach(nid => {
                    const val = node.modelParams!.attention![nid];
                    if (val > maxLogit) maxLogit = val;
                });

                // 2. Exponentials
                let sumExp = 0;
                const attentionWeights = new Map<string, number>();

                neighbors.forEach(nid => {
                    const logit = node.modelParams!.attention![nid];
                    const exp = Math.exp(logit - maxLogit);
                    attentionWeights.set(nid, exp);
                    sumExp += exp;
                });

                // 3. Normalize
                neighbors.forEach(nid => {
                    attentionWeights.set(nid, attentionWeights.get(nid)! / sumExp);
                });

                // --- C. Aggregate (Value Mapping) ---
                let contextVector = 0;
                neighbors.forEach(nid => {
                    contextVector += scores.get(nid)! * attentionWeights.get(nid)!;
                });

                // --- D. Error & Backprop ---
                const targetVal = this.getNodePrior(node);

                // Simple Residual Connection: Output = 0.2*Old + 0.8*Context
                // We want Context to match Target.
                const error = contextVector - targetVal;

                // Update Attention Logits
                // dLoss/dLogit_j = error * Val_j * Softmax_j * (1 - Softmax_j) -- Approx
                // Simplified Gradient: If neighbor J pulled us AWAY from target, reduce attention.
                // If neighbor J was close to target, increase attention.

                const lr = 0.05;
                neighbors.forEach(nid => {
                    const weight = attentionWeights.get(nid)!;
                    const neighborVal = scores.get(nid)!;

                    // Did this neighbor contribute to the error?
                    // If error is Positive (Prediction > Target), and Neighbor was High, it pushed us up. Reduce attention.
                    // Gradient ~ Error * NeighborValue
                    // But we must respect Softmax derivative roughly.

                    const grad = error * (neighborVal - contextVector) * weight; // Derivative of Softmax-Weighted Sum

                    node.modelParams!.attention![nid] -= lr * grad;
                });

                // --- E. Update Node State ---
                const current = nextScores.get(node.id)!;
                const newVal = current * 0.2 + contextVector * 0.8;

                if (Math.abs(newVal - current) > maxDelta) maxDelta = Math.abs(newVal - current);
                nextScores.set(node.id, newVal);
            });
            nextScores.forEach((v, k) => scores.set(k, v));
        }

        // Reliability scales with convergence
        return { scores, reliability: Math.max(0.1, 1.0 - maxDelta * 5) };
    }

    private calculateLocalEnergy(node: GraphNode, val: number, state: Map<string, number>): number {
        const { influence, totalWeight } = this.calculateInfluence(node, state);
        const prior = this.getNodePrior(node);
        const expected = (influence + prior * 0.5) / (totalWeight + 0.5);
        return Math.pow(val - expected, 2);
    }

    // --- Sensitivity Analysis ---
    runSensitivityAnalysis(targetId: string, evidence: Record<string, number>, algorithm: string = 'BN'): Map<string, number> {
        const sensitivityMap = new Map<string, number>();

        // UNWRAP: Handle the new AlgorithmResult return type
        const runAlgo = (ev: Record<string, number>) => {
            if (algorithm === 'DT') return this.runDT(ev).scores;
            // Default to BN for others in Gradient Analysis context
            return this.runBN(ev).scores;
        };

        const globalBaselineScores = runAlgo(evidence);
        const globalBaselineTarget = globalBaselineScores.get(targetId);

        if (globalBaselineTarget !== undefined) {
            const nodes = Array.from(this.graph.nodes.values());

            nodes.forEach(node => {
                if (node.id === targetId) return;

                // Scenario A: Attributes
                if (node.customAttributes && Object.keys(node.customAttributes).length > 0) {
                    const realBelief = node.beliefs['working'];
                    if (realBelief !== undefined) delete node.beliefs['working'];

                    const designBaselineScores = runAlgo(evidence);
                    const designBaselineTarget = designBaselineScores.get(targetId)!;

                    Object.entries(node.customAttributes).forEach(([attrKey, attrData]) => {
                        const originalConf = attrData.confidence;
                        attrData.confidence = Math.max(0, originalConf - 0.2);
                        const newScores = runAlgo(evidence);
                        const newTargetVal = newScores.get(targetId)!;
                        attrData.confidence = originalConf;

                        const delta = designBaselineTarget - newTargetVal;
                        const sensitivity = Math.abs(delta / 0.2);

                        if (sensitivity > 0.005) {
                            sensitivityMap.set(`${node.id}:${attrKey}`, parseFloat(sensitivity.toFixed(4)));
                        }
                    });

                    if (realBelief !== undefined) node.beliefs['working'] = realBelief;
                }

                // Scenario B: Structural
                {
                    const perturbedEvidence = { ...evidence };
                    const currentVal = evidence[node.id] ?? this.getNodePrior(node);
                    perturbedEvidence[node.id] = Math.max(0, currentVal - 0.2);

                    const newScores = runAlgo(perturbedEvidence);
                    const newTargetVal = newScores.get(targetId)!;
                    const delta = globalBaselineTarget - newTargetVal;
                    const actualPerturbation = currentVal - perturbedEvidence[node.id];

                    if (actualPerturbation > 0.001) {
                        const sensitivity = Math.abs(delta / actualPerturbation);
                        if (sensitivity > 0.005) {
                            sensitivityMap.set(node.id, parseFloat(sensitivity.toFixed(4)));
                        }
                    }
                }
            });
        }

        return sensitivityMap;
    }

    private calculateInfluence(node: GraphNode, scores: Map<string, number>) {
        const parents = this.graph.getParents(node.id);
        const children = this.graph.adjacency.get(node.id) || [];

        let influenceSum = 0;
        let weightSum = 0;

        [...parents, ...children].forEach(neighborId => {
            const conf = scores.get(neighborId) ?? 0.5;
            influenceSum += conf;
            weightSum += 1.0;
        });

        return { influence: influenceSum, totalWeight: weightSum };
    }

    private getNeighbors(node: GraphNode) {
        const parents = this.graph.getParents(node.id);
        const children = this.graph.adjacency.get(node.id) || [];
        return [...parents, ...children];
    }

    private getNodePrior(node: GraphNode): number {
        // CRITICAL FIX: The Prior should be based on Intrinsic Factors (Attributes/Tags).
        // It should NOT simply return the stored 'working' belief (Posterior), 
        // because that prevents the value from updating when attributes change.

        const validFactors: number[] = [];

        if (node.customAttributes && Object.keys(node.customAttributes).length > 0) {
            Object.values(node.customAttributes).forEach((attr: { value: number; confidence: number }) => {
                validFactors.push(attr.confidence);
            });
            // If attributes exist, they are the DEFINITIVE Prior.
            return validFactors.reduce((a, b) => a + b, 0) / validFactors.length;
        }

        if (node.tags) {
            Object.entries(node.tags).forEach(([key, val]) => {
                const sVal = String(val).toLowerCase();
                let parsedConfidence: number | null = null;
                if (sVal.endsWith('%')) {
                    const num = parseFloat(sVal);
                    if (!isNaN(num)) parsedConfidence = num / 100;
                } else if (!isNaN(parseFloat(sVal)) && parseFloat(sVal) <= 1.0) {
                    parsedConfidence = parseFloat(sVal);
                } else if (key.includes('status') || key.includes('quality') || key.includes('health')) {
                    if (sVal === 'high' || sVal === 'ok' || sVal === 'good') parsedConfidence = 0.98;
                    else if (sVal === 'medium' || sVal === 'fair') parsedConfidence = 0.85;
                    else if (sVal === 'low' || sVal === 'poor' || sVal === 'bad') parsedConfidence = 0.60;
                }
                if (parsedConfidence !== null) validFactors.push(parsedConfidence);
            });
        }

        if (validFactors.length > 0) {
            const attributesAvg = validFactors.reduce((a, b) => a + b, 0) / validFactors.length;
            // Blend with default optimism
            return (0.95 * 0.4) + (attributesAvg * 0.6);
        }

        // Fallback only if absolutely no intrinsic data exists
        // Check if we have a stored value that might be relevant (e.g. from simulation drift)
        // avoiding "0" lock from initialization
        if (node.beliefs['working'] !== undefined) {
            return node.beliefs['working'];
        }

        return 0.95;
    }
}

# Algorithms

Brief writeups for each non-trivial algorithm in the editor, with where to find the implementation and a pointer to the standard reference.

## Thompson's construction (regex -> NFA)

**File:** [src/main/regex_to_nfa.js](../src/main/regex_to_nfa.js)

The parser is a hand-written recursive descent over the grammar

```
expr   = term ('|' term)*
term   = factor*
factor = atom ('*' | '+' | '?')?
atom   = '(' expr ')' | literal
```

Empty alternatives inside `|` or `()` parse as epsilon. The grammar matches the subset described in Hopcroft, Motwani, and Ullman, *Introduction to Automata Theory, Languages, and Computation* (3rd ed., 2006), Section 3.2.3.

`thompson(ast)` walks the AST and emits NFA fragments per Thompson's construction (Thompson, K., "Regular expression search algorithm", *CACM* 11(6), 1968). Each fragment has one entry and one accept state. The constructions are textbook:

- `literal c`: two states with a `c`-edge between them.
- `concat A B`: epsilon from A.accept to B.start; result is `{ A.start, B.accept }`.
- `union A | B`: new start with epsilon-edges to A.start and B.start; new accept that A.accept and B.accept reach by epsilon.
- `star A`: new start with epsilon-edges to A.start and to a new accept; A.accept has epsilon back to A.start and forward to the new accept.
- `plus A`: desugars to `concat A (star A)`.
- `opt A`: desugars to `union A epsilon`.

The size of the produced NFA is linear in the size of the regex. `(a|b)*abb` yields 14 states.

## Subset construction (NFA -> DFA)

**File:** [src/main/nfa_to_dfa.js](../src/main/nfa_to_dfa.js)

Classical subset construction; see Hopcroft / Motwani / Ullman, Section 2.3.5, or the equivalent treatment in Sipser, *Introduction to the Theory of Computation*, Section 1.2 (Theorem 1.39).

We compute the epsilon-closure of the NFA start state as DFA state 0, then BFS: for each unvisited subset and each input symbol, the next subset is the epsilon-closure of every NFA-state reachable on that symbol from any current member. Subsets are keyed by their sorted comma-joined state indices for hash lookup.

Multiple transitions between the same DFA pair on different symbols are collapsed into one labeled edge using comma-separated symbols (matching how `simulate.js` parses link labels), so the rendered graph stays readable.

In the worst case the DFA has 2^n states for an n-state NFA. In practice the regex examples in the demo (notably `(a|b)*abb`) produce a 5-state DFA.

## Partition refinement minimization

**File:** [src/main/minimize.js](../src/main/minimize.js)

We use Moore's partition refinement (Moore, E. F., "Gedanken-experiments on Sequential Machines", *Automata Studies*, 1956) rather than Hopcroft's O(n log n) variant - the n^2 worst case is not a concern for diagrams users actually draw, and Moore is shorter and easier to read.

Initial partition: accept states vs. non-accept states. Each round, two states stay in the same block iff for every input symbol their transitions land in the same block. We repeat until no block splits.

After convergence we pick one representative per block, rewrite transitions in terms of partition indices, and emit a new DFA JSON. The result has, by construction, the minimum number of states recognizing the same language (proof: see Sipser, Theorem 7.41, or Hopcroft / Motwani / Ullman, Section 4.4).

Invariants we rely on at the input:
- Exactly one transition per (state, symbol) pair (we reject if not).
- No epsilon edges (we reject if any link's label parses to the empty symbol).

The minimizer is idempotent: feeding it its own output yields the same state count.

## Sugiyama-style layered layout

**File:** [src/main/layout.js](../src/main/layout.js)

The layered drawing convention (states grouped by distance from the start, drawn left-to-right) comes from Sugiyama, Tagawa, and Toda, "Methods for Visual Understanding of Hierarchical System Structures", *IEEE Transactions on SMC* 11(2), 1981. We implement the layering step only (no crossing minimization, no edge bundling), which is enough for the regex-NFA / DFA shapes the editor produces.

Steps:

1. Find the start state via the unique `StartLink`. Default to node 0 if missing.
2. BFS from the start, assigning layer = distance in edges.
3. Park any node not reached from the start in a trailing layer so it stays visible.
4. Within each layer, space nodes vertically around a fixed mid line.
5. For every link `nodeA -> nodeB`, if `layer(nodeB) <= layer(nodeA)` it's a back-edge; bow it perpendicular so the arrow doesn't pass through the source node's circle.

Layout always runs on FSM JSON before the result is loaded into the workspace, so the user never sees a pile of states at the same coordinate.

## NFA simulation

**File:** [src/main/simulate.js](../src/main/simulate.js)

Standard NFA simulation with epsilon-closures. The current configuration is a set of states; on each input symbol we compute the next set as the epsilon-closure of the union of step targets. Accept if any final-configuration state is an accept state. The `simulate()` function returns the path (one set per step) and a verdict; `simulateStep()` exposes one step at a time for the UI's Step button.

Reference: Sipser, Section 1.2 (NFAs), or Hopcroft / Motwani / Ullman, Section 2.3.4. The simulation runs in time O(|input| * |states|^2) over the link list, which is again not a concern for diagrams.

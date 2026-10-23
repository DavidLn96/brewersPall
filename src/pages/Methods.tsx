export function MethodsPage() {
  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <h1>How Calculations Work</h1>
          <p className="sub">Every number in the builder is an estimate from the formulas below. Calibrate your equipment profile with brew-day measurements to make them match your system.</p>
        </div>
      </div>
      <div className="prose">
        <p className="small muted">
          Internally all quantities are kept in kilograms, grams, liters, °C and specific gravity. US units are converted only for display and entry.
        </p>

        <h2>Original gravity</h2>
        <code className="formula">extract (points·L) = PPG × kg × 8.3454{'\n'}OG points = (Σ mash extract × kettle efficiency + Σ boil extract) ÷ cooled post-boil volume{'\n'}           + Σ fermenter additions ÷ fermenter volume</code>
        <ul>
          <li>Mash and steeped grains are multiplied by efficiency. Extracts and sugars added to the boil count at 100%.</li>
          <li>When batch size is measured into the fermenter, the efficiency you enter is brewhouse efficiency. Kettle efficiency is derived as brewhouse × post-boil volume ÷ fermenter volume.</li>
          <li>When batch size is the post-boil kettle volume, the efficiency is ending-kettle efficiency.</li>
          <li>Gravity is for cooled wort; potential is entered as SG (1.037 = 37 PPG).</li>
        </ul>

        <h2>Final gravity and ABV</h2>
        <code className="formula">FG points = fermentable points × (1 − attenuation) + unfermentable points{'\n'}ABV standard  = (OG − FG) × 131.25{'\n'}ABV alternate = 76.08 × (OG − FG) ÷ (1.775 − OG) × FG ÷ 0.794</code>
        <ul>
          <li>Attenuation is the highest of the recipe’s yeasts, or 75% when there is none.</li>
          <li>Lactose and maltodextrin are unfermentable and stay in the FG.</li>
          <li>Real attenuation depends on mash temperature, pitch rate and fermentation. Measure FG with a hydrometer.</li>
        </ul>

        <h2>Bitterness (IBU)</h2>
        <code className="formula">IBU = utilization × alpha% ÷ 100 × grams × 1000 ÷ cooled post-boil liters{'\n'}Tinseth: U = 1.65 × 0.000125^(Gb − 1) × (1 − e^(−0.04 t)) ÷ 4.15{'\n'}Rager:   U = 18.11% + 13.86% × tanh((t − 31.32) ÷ 18.27), ÷ (1 + (Gb − 1.050) ÷ 0.2) above 1.050</code>
        <ul>
          <li>Gb, the boil gravity, is the average of pre-boil and post-boil gravity.</li>
          <li>First-wort hops: full boil time with 10% more utilization. Mash hops: 20% of a full boil addition. Both are conventions, not measurements.</li>
          <li>Whirlpool: the steep time is scaled by the relative isomerization rate at its temperature, 2.39×10¹¹ × e^(−9773 ÷ K) (Malowicki), about 0.23 at 80 °C.</li>
          <li>Dry hops add no calculated IBU. Hop form (pellet, leaf, cryo) is recorded but does not change utilization.</li>
        </ul>

        <h2>Color</h2>
        <code className="formula">MCU = Σ (lb × °L) ÷ gallons{'\n'}Morey   SRM = 1.4922 × MCU^0.6859{'\n'}Daniels SRM = 0.2 × MCU + 8.4   (never more than MCU){'\n'}Mosher  SRM = 0.3 × MCU + 4.7   (never more than MCU){'\n'}EBC ≈ SRM × 1.97</code>
        <p className="small muted">The on-screen beer color is an approximation for display only.</p>

        <h2>Volumes and water</h2>
        <code className="formula">into fermenter + kettle loss + hop absorption = cooled post-boil{'\n'}cooled ÷ (1 − shrinkage) = hot post-boil{'\n'}hot post-boil + boil-off rate × hours = pre-boil{'\n'}pre-boil + grain absorption + mash tun dead space = total water{'\n'}strike water = grain × mash thickness + dead space; sparge = total − strike</code>
        <ul>
          <li>BIAB is a full-volume, no-sparge mash. Extract brews use all water for steeping and boiling.</li>
          <li>Top-off water for partial boils is not modeled yet.</li>
          <li>Capacity warnings assume grain displaces 0.67 L/kg.</li>
        </ul>

        <h2>Strike water temperature</h2>
        <code className="formula">Tw = (0.41 ÷ r) × (T mash − T grain) + T mash     (r in L/kg, °C){'\n'}   = (0.2 ÷ r) × (T mash − T grain) + T mash      (r in qt/lb, °F)</code>
        <p className="small muted">From John Palmer’s How to Brew. Assumes a preheated mash tun. Uses the first mash step’s temperature.</p>

        <h2>Yeast pitching</h2>
        <code className="formula">cells (billions) = rate × fermenter mL × °Plato ÷ 1000{'\n'}ale 0.75 (1.0 above 1.060) · lager 1.5 (2.0 above 1.060) million cells / mL / °P</code>
        <p className="small muted">A strain is treated as a lager yeast when its top recommended temperature is 16 °C or lower. Viability of a pack is not modeled.</p>

        <h2>Style ranges</h2>
        <p className="small muted">Style ranges come from the BJCP 2021 Beer Style Guidelines. Gravities are compared at 0.001 precision.</p>

        <h2>Testing</h2>
        <p className="small muted">
          The calculation engine is a separate module with automated tests against published reference values (Tinseth’s utilization table, Rager’s table, Palmer’s strike water example, the textbook OG example of 10 lb of 37 PPG malt in 5 gallons at 75%) and hand-calculated cases for boundaries, zero values and unit conversions.
        </p>
      </div>
    </div>
  );
}

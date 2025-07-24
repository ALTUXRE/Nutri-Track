// --- User Retrieval/Redirect ---
function getUser() {
  return JSON.parse(localStorage.getItem('fitlifeUser') || '{}');
}

if (window.location.pathname.endsWith('dashboard.html')) {
  const user = getUser();
  if (!user.age || !user.goal) window.location.href = 'index.html';
}

// --- Calorie Recommendation Adjusted for Goal ---
function calcRecommendedCalories({ age, weight, gender, activity, goal }) {
  // Mifflin-St Jeor, avg height
  const heights = { male: 170, female: 160 };
  const base = 10 * weight + 6.25 * heights[gender] - 5 * age + (gender === 'male' ? 5 : -161);
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
  let calories = Math.round(base * factors[activity]);
  if (goal === "lose") calories -= 400;    // ~400 kcal deficit
  else if (goal === "gain") calories += 400; // ~400 kcal surplus
  // Clamp below 1000
  calories = Math.max(calories, 1000);
  return calories;
}

// --- Water Recommendation ---
function calcRecommendedWater({ weight }) {
  return Math.round(weight * 35 / 100) / 4; // Cups
}

// --- Sample Diet Plan by Goal and Type ---
function getDietPlan(goal, type) {
  const choices = {
    veg: {
      lose: [
        { meal: "Breakfast", items: "Green smoothie, oats porridge, apple" },
        { meal: "Lunch", items: "Grilled veggies, dal, salad, 1 chapati" },
        { meal: "Snack", items: "Carrot sticks, buttermilk" },
        { meal: "Dinner", items: "Soup, stir-fried tofu, mixed greens" }
      ],
      maintain: [
        { meal: "Breakfast", items: "Oats, milk/yogurt, banana, nuts" },
        { meal: "Lunch", items: "Brown rice, chana, salad, curd" },
        { meal: "Snack", items: "Fruit bowl, roasted gram" },
        { meal: "Dinner", items: "Chapati, paneer sabzi, sautéed veg, dal" }
      ],
      gain: [
        { meal: "Breakfast", items: "Granola, milk, nuts, banana" },
        { meal: "Lunch", items: "Rice, rajma, ghee, mixed salad, curd" },
        { meal: "Snack", items: "Peanut butter toast, dry fruits, smoothie" },
        { meal: "Dinner", items: "Chapati, paneer curry, potato, dal, yogurt" }
      ]
    },
    nonveg: {
      lose: [
        { meal: "Breakfast", items: "Egg whites omelette, citrus fruit" },
        { meal: "Lunch", items: "Grilled chicken breast, sautéed greens, dal" },
        { meal: "Snack", items: "Boiled eggs, cucumber" },
        { meal: "Dinner", items: "Baked fish, stir-fried veggies" }
      ],
      maintain: [
        { meal: "Breakfast", items: "Egg omelet, wheat toast, apple" },
        { meal: "Lunch", items: "Rice/roti, chicken curry, salad, yogurt" },
        { meal: "Snack", items: "Greek yogurt, boiled eggs, nuts" },
        { meal: "Dinner", items: "Grilled fish/chicken, veggies, dal" }
      ],
      gain: [
        { meal: "Breakfast", items: "Eggs, cheese toast, peanut butter, banana" },
        { meal: "Lunch", items: "Rice, chicken curry, dal, salad, yogurt" },
        { meal: "Snack", items: "Chicken sandwich, dry fruits, smoothie" },
        { meal: "Dinner", items: "Chapati, mutton curry, potato, yogurt" }
      ]
    }
  };
  return (choices[type] && choices[type][goal]) ? choices[type][goal] : [];
}

// --- Recommendations Section ---
function showRecommendations() {
  const user = getUser();
  if (!user.age) return;
  const recCals = calcRecommendedCalories(user);
  const recWater = calcRecommendedWater(user);
  const meals = getDietPlan(user.goal, user.dietType);

  if (!document.getElementById('recommendations')) return;
  let goalText =
    user.goal === 'lose' ? "Weight Loss" :
    user.goal === 'gain' ? "Weight Gain" : "Weight Maintenance";

  let mealsHtml =
    "<table><thead><tr><th>Meal</th><th>Diet Suggestions</th></tr></thead><tbody>";
  meals.forEach(m => {
    mealsHtml += `<tr><td>${m.meal}</td><td>${m.items}</td></tr>`;
  });
  mealsHtml += "</tbody></table>";

  document.getElementById('recommendations').innerHTML = `
    <p><strong>Goal:</strong> ${goalText}</p>
    <p><strong>Recommended Calories:</strong> ${recCals} kcal/day</p>
    <p><strong>Recommended Water:</strong> ${recWater} cups (≈${(recWater*250).toFixed(0)} ml)</p>
    <div style="margin:8px 0 8px 0;"><strong>Sample ${user.dietType === "veg" ? "Vegetarian" : "Non-Vegetarian"} Diet Plan:</strong></div>
    ${mealsHtml}
  `;
}

// --- Diet Tracker Logic ---
let meals = JSON.parse(localStorage.getItem('meals')) || [];
function renderMeals() {
  const mealsList = document.getElementById('meals-list');
  if (!mealsList) return;
  mealsList.innerHTML = '';
  let totalCalories = 0;
  meals.forEach((meal, idx) => {
    totalCalories += meal.calories;
    mealsList.innerHTML += `
      <tr>
        <td>${meal.food}</td>
        <td>${meal.calories}</td>
        <td><button onclick="removeMeal(${idx})" style="background:#ff5864;">&#10008;</button></td>
      </tr>
    `;
  });
  const totalCals = document.getElementById('total-calories');
  if (totalCals) totalCals.textContent = `Total Calories: ${totalCalories}`;
  localStorage.setItem('meals', JSON.stringify(meals));
}
window.removeMeal = function(idx) {
  meals.splice(idx, 1);
  renderMeals();
};
function setupDietTracker() {
  const btn = document.getElementById('add-meal-btn');
  if (!btn) return;
  btn.onclick = () => {
    const food = document.getElementById('food-input').value.trim();
    const calories = Number(document.getElementById('calories-input').value);
    if (food && calories) {
      meals.push({ food, calories });
      document.getElementById('food-input').value = '';
      document.getElementById('calories-input').value = '';
      renderMeals();
    }
  };
  renderMeals();
}

// --- Water Tracker with Progress Bar ---
let waterCount = Number(localStorage.getItem('waterCount')) || 0;
function updateWater() {
  // update count
  const el = document.getElementById('water-count');
  if (el) el.textContent = waterCount;
  localStorage.setItem('waterCount', waterCount);

  // update progress bar
  const user = getUser();
  const recWater = calcRecommendedWater(user);
  const percent = Math.min(100, Math.round((waterCount / recWater) * 100));
  const pgBar = document.getElementById('water-progress-bar');
  const pgText = document.getElementById('water-progress-text');
  if (pgBar) {
    pgBar.style.width = percent + "%";
    pgBar.style.background = percent >= 100
      ? "linear-gradient(90deg, #00b55a 80%, #41e76a 100%)"
      : "linear-gradient(90deg, #4daef7 50%, #81e8fa 100%)";
  }
  if (pgText) pgText.textContent = percent + "%";
}
function setupWaterTracker() {
  const addBtn = document.getElementById('add-water-btn');
  const resetBtn = document.getElementById('reset-water-btn');
  if (addBtn)
    addBtn.onclick = () => { waterCount++; updateWater(); };
  if (resetBtn)
    resetBtn.onclick = () => { waterCount = 0; updateWater(); };
  updateWater();
}

// --- Initialization for Dashboard ---
if (window.location.pathname.endsWith('dashboard.html')) {
  window.onload = function () {
    showRecommendations();
    setupDietTracker();
    setupWaterTracker();
  }
}

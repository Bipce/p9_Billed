/**
 * @jest-environment jsdom
 */
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";

import { ROUTES_PATH } from "../constants/routes.js";
import { bills } from "../fixtures/bills.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";

import Bills from "../containers/Bills.js";
import BillsUI from "../views/BillsUI.js";
import router from "../app/Router.js";

// Mock
jest.mock("../app/Store.js", () => mockStore);
$.fn.modal = jest.fn();

describe("Given I am connected as an employee", () => {
  const initialisationBills = () => {
    document.body.innerHTML = BillsUI({ data: bills });
    const onNavigate = jest.fn();
    const store = mockStore;

    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem("user", JSON.stringify({
      type: "Employee",
    }));
    return new Bills({ document, onNavigate, store, localStorage });
  };

  describe("When I am on Bills Page", () => {
    let initializeBills;
    let handleClickNewBill;
    beforeEach(() => {
      // Create test environment
      initializeBills = initialisationBills();
      handleClickNewBill = jest.fn(initializeBills.handleClickNewBill);

    });

    test("Then bill icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      // Check if "active-icon" class is contain on icon-window
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });

    test("Then bills should be ordered from earliest to latest", () => {
      // test à observer attentivement pour les besoins du projet
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML);
      const antiChrono = (a, b) => ((a < b) ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    describe("When click on eye-icon of a bill", () => {
      test("Then render a modal", async () => {
        const eyeIcons = screen.getAllByTestId("icon-eye");
        userEvent.click(eyeIcons[0]);

        const modalBody = $("#modaleFile").find(".modal-body").innerHTML;
        await waitFor(() => {
          expect(modalBody !== "").toBe(true);
        });
      });
    });

    describe(`When click on button "Note de frais"`, () => {
      test("Then handleClickNewBill is called", () => {
        const newBillBtn = screen.getByTestId("btn-new-bill");
        newBillBtn.addEventListener("click", handleClickNewBill);
        userEvent.click(newBillBtn);

        expect(handleClickNewBill).toHaveBeenCalled();

        // Restore mock function
        handleClickNewBill.mockRestore();
      });
    });
  });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------Integration test -> GET-------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------

describe("Given I am connected as an employee", () => {
  describe("When I navigate to Bills Page", () => {
    test("fetches bills from mock API GET", async () => {
      // Use fake localstorage to create fictif connected user
      localStorage.setItem("user", JSON.stringify({
        type: "Employee",
        email: "a@a",
        password: "employee",
        status: "connected",
      }));

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      await waitFor(() => {
        expect(screen.getAllByText("Refused")).toBeTruthy();
        expect(screen.getByText("Accepté")).toBeTruthy();
        expect(screen.getAllByText("En attente")).toBeTruthy();
      });
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        // Create spy on bills function in the mockstore
        jest.spyOn(mockStore, "bills");
        // Create new local storage in the browser for test
        Object.defineProperty(
          window,
          "localStorage",
          { value: localStorageMock },
        );
        // Use fake local storage to create fictif connected user
        window.localStorage.setItem("user", JSON.stringify({
          type: "Employee",
          email: "a@a",
          password: "employee",
          status: "connected",
        }));

        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        // Create mockstore method with 404 error
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        // Create promise resolved in the next tick cycle process
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        // Create mockstore method with 500 error (server error)
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});
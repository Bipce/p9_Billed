/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import store from "../__mocks__/store.js";
import router from "../app/Router.js";


describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({
        type: "Employee",
      }));

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
    });

    test("Then mail icon in vertical layout should be highlighted", async () => {
      await waitFor(() => screen.getByTestId("icon-mail"));
      const mailIcon = screen.getByTestId("icon-mail");
      // Check if "active-icon" class is contain on icon-mail
      expect(mailIcon.classList.contains("active-icon")).toBe(true);
    });

    describe("When I select an image in a correct format", () => {
      test("Then the input file should display the file name", async () => {
        const newBill = new NewBill({
          document, onNavigate, store: store, localStorage: window.localStorage,
        });
        const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));

        // Add event listener on input file
        const input = screen.getByTestId("file");
        input.addEventListener("change", handleChangeFile);

        // Create file in correct format
        fireEvent.change(input, {
          target: {
            files: [new File(["image_test_unitaire.jpg"], "image_test_unitaire.jpg", {
              type: "image_test_unitaire/jpg",
            })],
          },
        });

        expect(handleChangeFile).toHaveBeenCalled();
        expect(input["files"][0].name).toBe("image_test_unitaire.jpg");
      });

      test("Then a bill is created", () => {
        document.body.innerHTML = NewBillUI();
        const newBill = new NewBill({
          document, onNavigate, store: null, localStorage: window.localStorage,
        });

        const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
        const submit = screen.getByTestId("form-new-bill");
        submit.addEventListener("submit", handleSubmit);
        fireEvent.submit(submit);
        expect(handleSubmit).toHaveBeenCalled();
      });
    });
  });
});

// ------------------------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------Integration test -> POST-------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------

describe("When I navigate to the page newBill", () => {
  describe("Given I am a user connected as Employee, and the user post a newBill", () => {
    test("add a bill from mock API POST", async () => {
      const storeBillMocked = jest.spyOn(store, "bills");
      const bill = {
        "id": "47qAXb6fIm2zOKkLzMro",
        "vat": "80",
        "fileUrl": "https://firebasestorage.googleapis.com/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a",
        "status": "pending",
        "type": "Hôtel et logement",
        "commentary": "séminaire billed",
        "name": "encore",
        "fileName": "preview-facture-free-201801-pdf-1.jpg",
        "date": "2004-04-04",
        "amount": 400,
        "commentAdmin": "ok",
        "email": "a@a",
        "pct": 20,
      };
      const postBills = await store.bills().update(bill);
      expect(storeBillMocked).toHaveBeenCalled();
      expect(postBills).toStrictEqual(bill);
    });

    test("add a bill from mock API POST with the function create", async () => {
      const postSpyMock = jest.spyOn(store, "bills");
      const bill = {
        fileUrl: "https://localhost:3456/images/test.jpg",
        key: "1234",
      };
      const postBills = await store.bills().create(bill);
      expect(postSpyMock).toHaveBeenCalled();
      expect(postBills).toStrictEqual(bill);
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
          }),
        );
        document.body.innerHTML = NewBillUI();
      });

      const errorTest = async (errCode) => {
        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
        };
        // Create store with the error code wanted
        const store = {
          bills: jest.fn(() => newBill.store),
          create: jest.fn(() => Promise.resolve({})),
          update: jest.fn(() => Promise.reject(new Error(errCode))),
        };

        const newBill = new NewBill({
          document, onNavigate, store, localStorage,
        });
        // Submit form
        const form = screen.getByTestId("form-new-bill");
        const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
        form.addEventListener("submit", handleSubmit);
        fireEvent.submit(form);

        // Make sure submission is done before continue
        await new Promise(process.nextTick);
      };

      test("add bills from an API and fails with 404 message error", async () => {
        const postSpy = jest.spyOn(console, "error");
        await errorTest("404");
        expect(postSpy).toBeCalledWith(new Error("404"));

      });

      test("add bills from an API and fails with 500 message error", async () => {
        const postSpy = jest.spyOn(console, "error");
        await errorTest("500");
        expect(postSpy).toBeCalledWith(new Error("500"));
      });
    });
  });
});

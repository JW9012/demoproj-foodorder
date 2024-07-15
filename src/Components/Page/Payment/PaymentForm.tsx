import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { useCreateOrderMutation } from "../../../Apis/orderApi";
import { toastNotify } from "../../../Helper";
import { apiResponse, cartItemModel, userModel } from "../../../Interfaces";
import { SD_Status } from "../../../Utility/SD";
import { orderSummaryProps } from "../Order/orderSummaryProps";
import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../Storage/Redux/store";
import {
  useDeleteShoppingCartMutation,
  useGetShoppingCartQuery,
} from "../../../Apis/shoppingCartApi";
//import { setShoppingCart } from "../../../Storage/Redux/shoppingCartSlice";

const PaymentForm = ({ data, userInput }: orderSummaryProps) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [createOrder] = useCreateOrderMutation();
  const [isProcessing, setIsProcessing] = useState(false);

  const [deleteShoppingCart] = useDeleteShoppingCartMutation();
  //hooks for refreshing cart after payment
  const dispatch = useDispatch();
  const userData: userModel = useSelector(
    (state: RootState) => state.userAuthStore
  );
  // const [skip, setSkip] = useState(true);
  // const { data: cartData, isLoading: cartIsLoading } = useGetShoppingCartQuery(
  //   userData.id,
  //   {
  //     skip: skip,
  //   }
  // );

  //
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }
    setIsProcessing(true);
    const result = await stripe.confirmPayment({
      //`Elements` instance to create the Payment Element
      elements,
      confirmParams: {
        return_url: "https://example.com/order/123/complete",
      },
      redirect: "if_required",
    });

    if (result.error) {
      // Show error
      toastNotify("An unexpected error occured.", "error");
      setIsProcessing(false);
    } else {
      let grandTotal = 0;
      let totalItems = 0;
      const orderDetailsDTO: any = [];
      data.cartItems?.forEach((item: cartItemModel) => {
        const tempOrderDetail: any = {};
        tempOrderDetail["menuItemId"] = item.menuItem?.id;
        tempOrderDetail["quantity"] = item.quantity;
        tempOrderDetail["itemName"] = item.menuItem?.name;
        tempOrderDetail["price"] = item.menuItem?.price;
        orderDetailsDTO.push(tempOrderDetail);
        grandTotal += item.quantity! * item.menuItem?.price!;
        totalItems += item.quantity!;
      });

      const response: apiResponse = await createOrder({
        pickupName: userInput.name,
        pickupPhoneNumber: userInput.phoneNumber,
        pickupEmail: userInput.email,
        totalItems: totalItems,
        orderTotal: grandTotal,
        orderDetailsDTO: orderDetailsDTO,
        stripePaymentIntentID: data.stripePaymentIntentId,
        applicationUserId: data.userId,
        status:
          result.paymentIntent.status === "succeeded"
            ? SD_Status.CONFIRMED
            : SD_Status.PENDING,
      });

      console.log(response);
      if (response) {
        if (response.data?.result.status === SD_Status.CONFIRMED) {
          //dispatch(setShoppingCart(cartData));

          console.log(userData.id);
          deleteShoppingCart(userData.id);
          navigate(
            `/order/orderConfirmed/${response.data.result.orderHeaderId}`
          );
        } else {
          navigate("/failed");
        }
      }
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        disabled={!stripe || isProcessing}
        className="btn btn-success mt-5 w-100"
      >
        <span id="button-text">
          {isProcessing ? "Processing ... " : "Submit Order"}
        </span>
      </button>
    </form>
  );
};

export default PaymentForm;
